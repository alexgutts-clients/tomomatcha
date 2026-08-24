-- ============================================================================
-- Propina
-- ----------------------------------------------------------------------------
-- La propina se cobra junto con el ticket y se guarda en su propia columna,
-- nunca disuelta dentro de `total`. Esa separación es lo que permite después
-- responder «¿cuánto se juntó de propina hoy?» sin recalcular nada, y es
-- información que el equipo va a pedir todos los días.
--
--   subtotal  →  lo que se pidió
--   descuento →  se aplica sólo sobre el consumo, nunca sobre la propina
--   tip       →  lo que dejó el cliente encima
--   total     →  consumo con descuento + propina; es lo que se cobra de verdad
--
-- El descuento no toca la propina a propósito: una promoción del 20% es del
-- negocio, y descontarle a lo que el cliente quiso dar al equipo sería
-- quitarle dinero a quien no lo puso.
--
-- El corte de caja separa la propina de la venta en columnas nuevas, para que
-- al contar el cajón se sepa qué parte del efectivo es ingreso y qué parte hay
-- que repartir.
-- ============================================================================

/* -------------------------------- Pedidos --------------------------------- */

alter table orders
  add column if not exists tip numeric(12,2) not null default 0;

/* ----------------------------- Corte de caja ------------------------------ */
-- `expected_cash` y `expected_card` siguen significando lo mismo que antes (el
-- dinero que debería haber, propina incluida, porque es lo que físicamente
-- está en el cajón). Estas columnas dicen cuánto de eso era propina.

alter table cash_closes
  add column if not exists tips_cash numeric(12,2) not null default 0;

alter table cash_closes
  add column if not exists tips_total numeric(12,2) not null default 0;

-- ============================================================================
-- create_order · ahora acepta propina
-- ----------------------------------------------------------------------------
-- Reemplaza la versión de 20260824000006. Igual que allí, el precio de cada
-- renglón se relee de la base; la propina es el único importe que viene del
-- cliente, y se valida aquí: no puede ser negativa y no puede pasar del monto
-- del consumo (una propina mayor que la cuenta es siempre un dedazo en la caja,
-- y cobrarla sería peor que rechazarla).
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
  v_consumo       numeric(12,2);
  v_tip           numeric(12,2);
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
    folio, subtotal, discount_pct, discount_label, tip, total, payment, status,
    service_mode, cash_received, created_by, created_by_name
  ) values (
    v_folio, 0, v_discount, nullif(payload->>'discountLabel', ''), 0, 0, v_payment, 'nuevo',
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

  -- Consumo con descuento aplicado. La propina se suma después, para que una
  -- promoción no le recorte al equipo lo que el cliente quiso dejarle.
  v_consumo := round(v_subtotal * (1 - v_discount / 100), 2);

  v_tip := round(greatest(0, coalesce((payload->>'tip')::numeric, 0)), 2);
  if v_tip > v_consumo then
    raise exception 'La propina no puede ser mayor que el consumo';
  end if;

  v_total := round(v_consumo + v_tip, 2);

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
         tip = v_tip,
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

-- ============================================================================
-- close_cash · registra cuánta propina se juntó
-- ----------------------------------------------------------------------------
-- `expected_cash` sigue siendo todo el efectivo que debería estar en el cajón,
-- propina incluida: es lo que la persona que cuenta va a encontrar. Las
-- columnas de propina dicen cuánto de ese dinero hay que repartir.
-- ============================================================================

create or replace function close_cash(p_counted numeric, p_notes text, p_staff_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_tz         text;
  v_day        date;
  v_start      timestamptz;
  v_end        timestamptz;
  v_cash       numeric(12,2);
  v_card       numeric(12,2);
  v_tips_cash  numeric(12,2);
  v_tips_total numeric(12,2);
  v_count      integer;
  v_id         uuid;
  v_name       text;
begin
  select timezone into v_tz from settings where id = 1;
  v_tz := coalesce(v_tz, 'UTC');
  v_day := (now() at time zone v_tz)::date;
  v_start := (v_day::timestamp) at time zone v_tz;
  v_end := ((v_day + 1)::timestamp) at time zone v_tz;

  if exists (select 1 from cash_closes where date_key = v_day) then
    raise exception 'El corte de hoy ya fue registrado';
  end if;

  select
    coalesce(sum(total) filter (where payment = 'efectivo'), 0),
    coalesce(sum(total) filter (where payment <> 'efectivo'), 0),
    coalesce(sum(tip) filter (where payment = 'efectivo'), 0),
    coalesce(sum(tip), 0),
    count(*)
  into v_cash, v_card, v_tips_cash, v_tips_total, v_count
  from orders
  where created_at >= v_start and created_at < v_end and status <> 'cancelado';

  select full_name into v_name from staff where id = p_staff_id;

  insert into cash_closes (
    date_key, expected_cash, expected_card, counted_cash, difference,
    tips_cash, tips_total, orders_count, notes, closed_by, closed_by_name
  ) values (
    v_day, v_cash, v_card, p_counted, round(p_counted - v_cash, 2),
    v_tips_cash, v_tips_total,
    v_count, nullif(trim(coalesce(p_notes, '')), ''), p_staff_id, coalesce(v_name, 'Equipo')
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function close_cash(numeric, text, uuid) from public;
revoke all on function close_cash(numeric, text, uuid) from anon, authenticated;
grant execute on function close_cash(numeric, text, uuid) to service_role, postgres;
