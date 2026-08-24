-- ============================================================================
-- create_order · descuento de empaque según el modo de servicio
-- ----------------------------------------------------------------------------
-- Un pedido "para aquí" se sirve en loza: no gasta vaso ni tapa. Uno "para
-- llevar" sí. La única diferencia en el consumo son los insumos marcados como
-- empaque; el resto de la receta se descuenta igual en ambos casos.
-- ============================================================================

create or replace function create_order(payload jsonb, p_staff_id uuid default null)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_settings      settings%rowtype;
  v_line          jsonb;
  v_product       products%rowtype;
  v_milk          milk_options%rowtype;
  v_extra         extras%rowtype;
  v_extra_id      uuid;
  v_extras_json   jsonb;
  v_extras_price  numeric(12,2);
  v_mods          jsonb;
  v_qty           integer;
  v_unit_price    numeric(12,2);
  v_mods_price    numeric(12,2);
  v_subtotal      numeric(12,2) := 0;
  v_discount      numeric(5,2);
  v_total         numeric(12,2);
  v_folio         integer;
  v_order_id      uuid;
  v_customer      customers%rowtype;
  v_points        integer := null;
  v_line_no       integer := 0;
  v_payment       payment_method;
  v_service       service_mode;
  v_staff_name    text;
  v_usage         jsonb := '{}'::jsonb;
  v_key           text;
  v_ing           ingredients%rowtype;
  v_new_stock     numeric(12,2);
  v_recipe        record;
  v_target        uuid;
begin
  select * into v_settings from settings where id = 1 for update;
  if not found then
    raise exception 'La configuración del negocio no existe';
  end if;

  if jsonb_array_length(coalesce(payload->'lines', '[]'::jsonb)) = 0 then
    raise exception 'El ticket está vacío';
  end if;

  if exists (select 1 from cash_closes where date_key = business_day()) then
    raise exception 'El corte de caja de hoy ya está cerrado';
  end if;

  v_payment := coalesce((payload->>'payment')::payment_method, 'efectivo');
  if v_payment = 'mercadopago' and not v_settings.flag_mercadopago then
    raise exception 'Mercado Pago está desactivado en Ajustes';
  end if;

  v_service := coalesce((payload->>'serviceMode')::service_mode, 'llevar');
  v_discount := greatest(0, least(100, coalesce((payload->>'discountPct')::numeric, 0)));

  select full_name into v_staff_name from staff where id = p_staff_id;

  update settings
     set next_folio = next_folio + 1
   where id = 1
  returning next_folio - 1 into v_folio;

  insert into orders (
    folio, subtotal, discount_pct, discount_label, total, payment, status,
    service_mode, cash_received, created_by, created_by_name
  ) values (
    v_folio, 0, v_discount, nullif(payload->>'discountLabel', ''), 0, v_payment, 'nuevo',
    v_service, (payload->>'cashReceived')::numeric, p_staff_id, v_staff_name
  ) returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(payload->'lines') loop
    select * into v_product from products where id = (v_line->>'productId')::uuid;
    if not found then
      raise exception 'Producto no encontrado en el ticket';
    end if;
    if not v_product.active then
      raise exception 'El producto "%" ya no está en el menú', v_product.name;
    end if;

    v_qty := greatest(1, coalesce((v_line->>'qty')::integer, 1));
    v_unit_price := v_product.price;
    v_mods_price := 0;
    v_extras_json := '[]'::jsonb;
    v_extras_price := 0;
    v_milk := null;

    if v_product.mod_milk and nullif(v_line->>'milkId', '') is not null then
      select * into v_milk from milk_options where id = (v_line->>'milkId')::uuid and available;
      if found then
        v_mods_price := v_mods_price + v_milk.surcharge;
      else
        v_milk := null;
      end if;
    end if;

    if v_product.mod_extras then
      for v_extra_id in
        select (value #>> '{}')::uuid from jsonb_array_elements(coalesce(v_line->'extraIds', '[]'::jsonb))
      loop
        select * into v_extra from extras where id = v_extra_id and available;
        if found then
          v_extras_price := v_extras_price + v_extra.price;
          v_extras_json := v_extras_json || jsonb_build_object(
            'id', v_extra.id, 'name', v_extra.name, 'price', v_extra.price
          );
        end if;
      end loop;
      v_mods_price := v_mods_price + v_extras_price;
    end if;

    v_mods := jsonb_strip_nulls(jsonb_build_object(
      'milkId',      v_milk.id,
      'milkName',    v_milk.name,
      'sweetness',   case when v_product.mod_sweetness then (v_line->>'sweetness')::integer end,
      'temperature', case when v_product.mod_temperature then nullif(v_line->>'temperature', '') end,
      'notes',       nullif(trim(coalesce(v_line->>'notes', '')), '')
    )) || jsonb_build_object(
      'extraIds', (select coalesce(jsonb_agg(e->'id'), '[]'::jsonb) from jsonb_array_elements(v_extras_json) e),
      'extras',   v_extras_json
    );

    insert into order_items (
      order_id, product_id, name, emoji, image_key, qty, unit_price, mods_price, modifiers, line_no
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.emoji, v_product.image_key,
      v_qty, v_unit_price, v_mods_price, v_mods, v_line_no
    );
    v_line_no := v_line_no + 1;
    v_subtotal := v_subtotal + (v_unit_price + v_mods_price) * v_qty;

    if v_settings.flag_inventario then
      for v_recipe in
        select pri.ingredient_id,
               pri.is_milk,
               pri.qty,
               coalesce(ing.is_packaging, false) as is_packaging
          from product_recipe_items pri
          left join ingredients ing on ing.id = pri.ingredient_id
         where pri.product_id = v_product.id
      loop
        -- Servido en el local: el empaque no se gasta.
        continue when v_service = 'aqui' and v_recipe.is_packaging;

        v_target := case when v_recipe.is_milk then v_milk.ingredient_id else v_recipe.ingredient_id end;
        if v_target is not null then
          v_key := v_target::text;
          v_usage := jsonb_set(
            v_usage, array[v_key],
            to_jsonb(coalesce((v_usage->>v_key)::numeric, 0) + v_recipe.qty * v_qty)
          );
        end if;
      end loop;

      for v_recipe in
        select eri.ingredient_id,
               eri.qty,
               coalesce(ing.is_packaging, false) as is_packaging
          from extra_recipe_items eri
          left join ingredients ing on ing.id = eri.ingredient_id
         where eri.extra_id in (
           select (e->>'id')::uuid from jsonb_array_elements(v_extras_json) e
         )
      loop
        continue when v_service = 'aqui' and v_recipe.is_packaging;

        v_key := v_recipe.ingredient_id::text;
        v_usage := jsonb_set(
          v_usage, array[v_key],
          to_jsonb(coalesce((v_usage->>v_key)::numeric, 0) + v_recipe.qty * v_qty)
        );
      end loop;
    end if;
  end loop;

  v_total := round(v_subtotal * (1 - v_discount / 100), 2);

  if v_settings.flag_lealtad and nullif(payload->>'customerId', '') is not null then
    select * into v_customer from customers where id = (payload->>'customerId')::uuid for update;
    if found then
      v_points := round(v_total * v_settings.points_per_currency)::integer;
      update customers
         set points = points + v_points,
             visits = visits + 1,
             last_visit = now()
       where id = v_customer.id
      returning points into v_customer.points;

      insert into loyalty_transactions (customer_id, points, balance_after, reason, order_id, staff_id)
      values (v_customer.id, v_points, v_customer.points, 'Compra #' || v_folio, v_order_id, p_staff_id);
    else
      v_customer := null;
    end if;
  end if;

  update orders
     set subtotal = v_subtotal,
         total = v_total,
         customer_id = v_customer.id,
         customer_name = v_customer.name,
         points_earned = v_points
   where id = v_order_id;

  for v_key in select jsonb_object_keys(v_usage) loop
    update ingredients
       set stock = greatest(0, round(stock - (v_usage->>v_key)::numeric, 2))
     where id = v_key::uuid
    returning * into v_ing;

    if found then
      v_new_stock := v_ing.stock;
      insert into inventory_movements (ingredient_id, delta, stock_after, reason, order_id, staff_id)
      values (v_ing.id, -(v_usage->>v_key)::numeric, v_new_stock, 'venta', v_order_id, p_staff_id);
    end if;
  end loop;

  return v_order_id;
end;
$$;

revoke all on function create_order(jsonb, uuid) from public;
revoke all on function create_order(jsonb, uuid) from anon, authenticated;
grant execute on function create_order(jsonb, uuid) to service_role, postgres;
