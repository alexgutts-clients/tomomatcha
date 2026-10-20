-- ============================================================================
-- Inventario exacto · la existencia es la suma de sus movimientos
-- ----------------------------------------------------------------------------
-- El cliente reportó que las ventas «no restan» del inventario. La receta sí se
-- leía bien; lo que fallaba era la aritmética alrededor de ella:
--
--   1. Tope en cero. `create_order` hacía `greatest(0, stock - consumo)`. Como
--      las existencias arrancan en cero (el inventario real se cuenta, no se
--      adivina), mientras nadie capturaba existencias cada venta dejaba el
--      insumo en 0: desde la pantalla, la venta no restaba nada. Y cuando sí
--      había existencia, todo lo que la venta pedía de más desaparecía sin
--      dejar rastro en la cifra.
--
--   2. Devoluciones infladas. El movimiento guardaba el consumo completo pero
--      el stock sólo había bajado hasta 0; al cancelar o borrar el ticket se
--      devolvía el consumo completo. Inventario que nunca existió.
--
--   3. Devolución doble. Quitar un renglón (`delete_order_item`) devolvía sus
--      insumos, y cancelar después el ticket (`cancel_order`) devolvía otra vez
--      TODO lo de la venta, ese renglón incluido. `delete_order` igual.
--
--   4. Redondeo. La receta admite tres decimales y la existencia sólo dos: un
--      consumo de 0.004 se redondeaba a nada en cada venta.
--
-- La regla que sustituye a todo eso es una sola: la existencia de un insumo es
-- siempre lo que había más la suma de sus movimientos, sin topes ni redondeos
-- que la desvíen de la bitácora. De ahí sale lo demás:
--
--   · Una venta descuenta exactamente lo que dice la receta, aunque deje la
--     existencia en negativo. Un negativo es información: «se vendió más de lo
--     que estaba registrado; hay que contar». Una venta no se bloquea por falta
--     de insumos, igual que antes.
--   · Toda devolución (cancelar, borrar, quitar un renglón) se calcula sobre lo
--     que el ticket consumió NETO — sus ventas menos lo que ya se le devolvió —,
--     nunca sobre la venta original. Así nada se devuelve dos veces.
--   · Una salida manual (merma, −) sí se rechaza si dejaría la existencia bajo
--     cero: eso es un error de captura, no una venta, y para cuadrar la cifra
--     existe «Contar».
--
-- Las existencias que ya quedaron mal por el tope no se pueden reconstruir con
-- certeza desde la bitácora (un conteo posterior se calculó contra la cifra
-- topada). Después de aplicar esta migración hay que hacer un «Contar» de los
-- insumos para partir de la cifra real.
-- ============================================================================

/* --------------------------- Tres decimales ------------------------------- */
-- Igual que `inventory_movements.delta` y las cantidades de receta.

alter table ingredients
  alter column stock type numeric(12,3);

alter table inventory_movements
  alter column stock_after type numeric(12,3);

-- ============================================================================
-- create_order · descuenta la receta completa, sin tope en cero
-- ----------------------------------------------------------------------------
-- Reemplaza la versión de 20260824000007. Lo único que cambia es el descuento
-- de stock al final; precios, propina, empaque y lealtad quedan idénticos.
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
  v_new_stock     numeric(12,3);
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

  -- Se descuenta exactamente lo que dice la receta, aunque la existencia quede
  -- en negativo: un negativo significa «se vendió más de lo registrado, hay que
  -- contar», y es información. Topar en cero la borraba.
  for v_key in select jsonb_object_keys(v_usage) loop
    update ingredients
       set stock = round(stock - (v_usage->>v_key)::numeric, 3)
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

-- ---------------------------------------------------------------------------
-- Consumo neto de un ticket por insumo
-- ---------------------------------------------------------------------------
-- Lo que el ticket se llevó del inventario y todavía no se le ha devuelto: sus
-- movimientos de venta (negativos) más sus devoluciones (positivas). Es la
-- única cifra contra la que se puede devolver sin inflar existencias.

create or replace function order_net_usage(p_order_id uuid)
returns table (ingredient_id uuid, qty numeric)
language sql
stable
set search_path = public, pg_temp
as $$
  select m.ingredient_id, -sum(m.delta) as qty
    from inventory_movements m
   where m.order_id = p_order_id
     and m.reason in ('venta', 'cancelacion')
   group by m.ingredient_id
  having -sum(m.delta) > 0;
$$;

revoke all on function order_net_usage(uuid) from public;
revoke all on function order_net_usage(uuid) from anon, authenticated;
grant execute on function order_net_usage(uuid) to service_role, postgres;

-- ============================================================================
-- adjust_stock · movimiento manual, sin tope en cero
-- ----------------------------------------------------------------------------
-- Antes: `greatest(0, stock + delta)`. Con la existencia en negativo, una merma
-- la SUBÍA a cero mientras la bitácora decía que bajó. Ahora la existencia
-- cambia exactamente en `p_delta`, y una salida que la dejaría bajo cero se
-- rechaza: no se puede tirar lo que no está registrado. «Contar» nunca choca
-- con esto porque su destino es una cifra contada, que no es negativa.
-- ============================================================================

create or replace function adjust_stock(
  p_ingredient_id uuid,
  p_delta numeric,
  p_reason movement_reason,
  p_staff_id uuid,
  p_note text default null
)
returns numeric
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_stock numeric(12,3);
begin
  select stock into v_stock from ingredients where id = p_ingredient_id for update;
  if not found then
    raise exception 'Insumo no encontrado';
  end if;

  if p_delta < 0 and v_stock + p_delta < 0 then
    raise exception 'No hay tanta existencia registrada; si la cifra no cuadra con lo que hay, usa «Contar»';
  end if;

  update ingredients
     set stock = round(stock + p_delta, 3)
   where id = p_ingredient_id
  returning stock into v_stock;

  insert into inventory_movements (ingredient_id, delta, stock_after, reason, staff_id, note)
  values (p_ingredient_id, p_delta, v_stock, p_reason, p_staff_id, nullif(trim(coalesce(p_note, '')), ''));

  return v_stock;
end;
$$;

revoke all on function adjust_stock(uuid, numeric, movement_reason, uuid, text) from public;
revoke all on function adjust_stock(uuid, numeric, movement_reason, uuid, text) from anon, authenticated;
grant execute on function adjust_stock(uuid, numeric, movement_reason, uuid, text) to service_role, postgres;

-- ============================================================================
-- cancel_order · devuelve el consumo neto
-- ----------------------------------------------------------------------------
-- Reemplaza la versión de 20260824000003. Si antes se quitó un renglón, sus
-- insumos ya volvieron; aquí sólo regresa lo que el ticket sigue debiendo.
-- ============================================================================

create or replace function cancel_order(p_order_id uuid, p_staff_id uuid default null)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_order   orders%rowtype;
  v_mov     record;
  v_stock   numeric(12,3);
  v_balance integer;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'El ticket no existe';
  end if;
  if v_order.status = 'cancelado' then
    raise exception 'El ticket #% ya estaba cancelado', v_order.folio;
  end if;
  if exists (select 1 from cash_closes where date_key = business_day(v_order.created_at)) then
    raise exception 'El corte del día de este ticket ya se cerró; cancelarlo descuadraría la caja';
  end if;

  for v_mov in select * from order_net_usage(p_order_id) loop
    update ingredients
       set stock = round(stock + v_mov.qty, 3)
     where id = v_mov.ingredient_id
    returning stock into v_stock;

    if found then
      insert into inventory_movements (ingredient_id, delta, stock_after, reason, order_id, staff_id, note)
      values (v_mov.ingredient_id, v_mov.qty, v_stock, 'cancelacion', p_order_id, p_staff_id,
              'Cancelación del ticket #' || v_order.folio);
    end if;
  end loop;

  -- Retiro de los puntos otorgados por esta compra.
  if v_order.customer_id is not null and coalesce(v_order.points_earned, 0) <> 0 then
    update customers
       set points = greatest(0, points - v_order.points_earned),
           visits = greatest(0, visits - 1)
     where id = v_order.customer_id
    returning points into v_balance;

    if found then
      insert into loyalty_transactions (customer_id, points, balance_after, reason, order_id, staff_id)
      values (v_order.customer_id, -v_order.points_earned, v_balance,
              'Cancelación del ticket #' || v_order.folio, p_order_id, p_staff_id);
    end if;
  end if;

  update orders
     set status = 'cancelado',
         delivered_at = null,
         points_earned = null
   where id = p_order_id;
end;
$$;

revoke all on function cancel_order(uuid, uuid) from public;
revoke all on function cancel_order(uuid, uuid) from anon, authenticated;
grant execute on function cancel_order(uuid, uuid) to service_role, postgres;

-- ============================================================================
-- delete_order · devuelve el consumo neto antes de borrar
-- ----------------------------------------------------------------------------
-- Reemplaza la versión de 20260824000008. El orden sigue siendo obligatorio
-- (devolver, luego borrar la bitácora, luego el ticket). Ya no hace falta
-- distinguir un ticket cancelado: su consumo neto es cero porque la
-- cancelación ya lo devolvió, así que no regresa nada dos veces.
-- ============================================================================

create or replace function delete_order(p_order_id uuid, p_staff_id uuid default null)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_order   orders%rowtype;
  v_mov     record;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'El ticket no existe';
  end if;

  if exists (select 1 from cash_closes where date_key = business_day(v_order.created_at)) then
    raise exception 'El corte del día de este ticket ya se cerró; borrarlo descuadraría la caja';
  end if;

  for v_mov in select * from order_net_usage(p_order_id) loop
    update ingredients
       set stock = round(stock + v_mov.qty, 3)
     where id = v_mov.ingredient_id;
  end loop;

  -- Retiro de los puntos otorgados por esta compra (un ticket cancelado ya
  -- los devolvió y tiene `points_earned` en null).
  if v_order.status <> 'cancelado'
     and v_order.customer_id is not null
     and coalesce(v_order.points_earned, 0) <> 0 then
    update customers
       set points = greatest(0, points - v_order.points_earned),
           visits = greatest(0, visits - 1)
     where id = v_order.customer_id;
  end if;

  delete from inventory_movements where order_id = p_order_id;
  delete from loyalty_transactions where order_id = p_order_id;

  -- `order_items` cae en cascada.
  delete from orders where id = p_order_id;

  return v_order.folio;
end;
$$;

revoke all on function delete_order(uuid, uuid) from public;
revoke all on function delete_order(uuid, uuid) from anon, authenticated;
grant execute on function delete_order(uuid, uuid) to service_role, postgres;

-- ============================================================================
-- delete_order_item · devuelve lo del renglón, nunca más de lo que se consumió
-- ----------------------------------------------------------------------------
-- Reemplaza la versión de 20260824000009. El consumo del renglón se sigue
-- recalculando desde la receta (la bitácora no guarda renglones), pero ahora
-- cada insumo se topa en lo que el ticket todavía tiene consumido. Eso cubre
-- tres casos que antes devolvían inventario que nunca salió:
--
--   · la receta cambió después de la venta;
--   · la venta se hizo con Inventario apagado y hoy está encendido;
--   · el ticket ya estaba cancelado.
--
-- Por la misma razón ya no se consulta el interruptor de Inventario de hoy: lo
-- que decide si hay algo que devolver es lo que la venta descontó entonces.
-- ============================================================================

create or replace function delete_order_item(p_item_id uuid, p_staff_id uuid default null)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_item      order_items%rowtype;
  v_order     orders%rowtype;
  v_settings  settings%rowtype;
  v_left      integer;
  v_milk_ing  uuid;
  v_usage     jsonb := '{}'::jsonb;
  v_net       jsonb;
  v_key       text;
  v_qty       numeric;
  v_recipe    record;
  v_target    uuid;
  v_stock     numeric(12,3);
  v_subtotal  numeric(12,2);
  v_consumo   numeric(12,2);
  v_tip       numeric(12,2);
  v_total     numeric(12,2);
  v_points    integer;
  v_delta     integer;
  v_balance   integer;
begin
  select * into v_item from order_items where id = p_item_id;
  if not found then
    raise exception 'El renglón no existe';
  end if;

  select * into v_order from orders where id = v_item.order_id for update;
  if not found then
    raise exception 'El ticket no existe';
  end if;

  if exists (select 1 from cash_closes where date_key = business_day(v_order.created_at)) then
    raise exception 'El corte del día de este ticket ya se cerró; cambiarlo descuadraría la caja';
  end if;

  select count(*) into v_left from order_items where order_id = v_order.id;
  if v_left <= 1 then
    raise exception 'Es el único producto del ticket; borra el ticket completo';
  end if;

  select * into v_settings from settings where id = 1;

  /* ------------------- Devolución de insumos del renglón ------------------- */
  select coalesce(jsonb_object_agg(ingredient_id::text, qty), '{}'::jsonb)
    into v_net
    from order_net_usage(v_order.id);

  if v_net <> '{}'::jsonb then
    -- La leche que se eligió quedó grabada en los modificadores del renglón.
    if nullif(v_item.modifiers->>'milkId', '') is not null then
      select ingredient_id into v_milk_ing
        from milk_options
       where id = (v_item.modifiers->>'milkId')::uuid;
    end if;

    for v_recipe in
      select pri.ingredient_id,
             pri.is_milk,
             pri.qty,
             coalesce(ing.is_packaging, false) as is_packaging
        from product_recipe_items pri
        left join ingredients ing on ing.id = pri.ingredient_id
       where pri.product_id = v_item.product_id
    loop
      continue when v_order.service_mode = 'aqui' and v_recipe.is_packaging;

      v_target := case when v_recipe.is_milk then v_milk_ing else v_recipe.ingredient_id end;
      if v_target is not null then
        v_key := v_target::text;
        v_usage := jsonb_set(
          v_usage, array[v_key],
          to_jsonb(coalesce((v_usage->>v_key)::numeric, 0) + v_recipe.qty * v_item.qty)
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
         select (e->>'id')::uuid
           from jsonb_array_elements(coalesce(v_item.modifiers->'extras', '[]'::jsonb)) e
       )
    loop
      continue when v_order.service_mode = 'aqui' and v_recipe.is_packaging;

      v_key := v_recipe.ingredient_id::text;
      v_usage := jsonb_set(
        v_usage, array[v_key],
        to_jsonb(coalesce((v_usage->>v_key)::numeric, 0) + v_recipe.qty * v_item.qty)
      );
    end loop;

    for v_key in select jsonb_object_keys(v_usage) loop
      -- Nunca más de lo que este ticket todavía tiene consumido de ese insumo.
      v_qty := least((v_usage->>v_key)::numeric, coalesce((v_net->>v_key)::numeric, 0));
      continue when v_qty <= 0;

      update ingredients
         set stock = round(stock + v_qty, 3)
       where id = v_key::uuid
      returning stock into v_stock;

      if found then
        insert into inventory_movements (ingredient_id, delta, stock_after, reason, order_id, staff_id, note)
        values (v_key::uuid, v_qty, v_stock, 'cancelacion', v_order.id, p_staff_id,
                'Se quitó "' || v_item.name || '" del ticket #' || v_order.folio);
      end if;
    end loop;
  end if;

  delete from order_items where id = p_item_id;

  /* --------------------------- Cuentas del ticket -------------------------- */

  select coalesce(sum((unit_price + mods_price) * qty), 0)
    into v_subtotal
    from order_items
   where order_id = v_order.id;

  v_consumo := round(v_subtotal * (1 - v_order.discount_pct / 100), 2);

  -- La propina se respeta; sólo se recorta si ya no cabe en el consumo.
  v_tip := least(coalesce(v_order.tip, 0), v_consumo);
  v_total := round(v_consumo + v_tip, 2);

  /* ------------------------------- Lealtad --------------------------------- */
  if v_order.customer_id is not null and v_order.points_earned is not null then
    v_points := round(v_total * v_settings.points_per_currency)::integer;
    v_delta := v_points - v_order.points_earned;

    if v_delta <> 0 then
      update customers
         set points = greatest(0, points + v_delta)
       where id = v_order.customer_id
      returning points into v_balance;

      if found then
        insert into loyalty_transactions (customer_id, points, balance_after, reason, order_id, staff_id)
        values (v_order.customer_id, v_delta, v_balance,
                'Ajuste por cambio en el ticket #' || v_order.folio, v_order.id, p_staff_id);
      end if;
    end if;
  end if;

  update orders
     set subtotal = v_subtotal,
         tip = v_tip,
         total = v_total,
         points_earned = coalesce(v_points, points_earned)
   where id = v_order.id;

  return v_order.id;
end;
$$;

revoke all on function delete_order_item(uuid, uuid) from public;
revoke all on function delete_order_item(uuid, uuid) from anon, authenticated;
grant execute on function delete_order_item(uuid, uuid) to service_role, postgres;
