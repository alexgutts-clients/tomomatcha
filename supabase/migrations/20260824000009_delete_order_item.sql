-- ============================================================================
-- delete_order_item · quitar un renglón de un ticket
-- ----------------------------------------------------------------------------
-- Hermano de `delete_order`, y con el mismo propósito: limpiar capturas de
-- prueba. La diferencia es el alcance. Aquí no se va el ticket entero, sólo uno
-- de sus renglones, y por eso hay que rehacer las cuentas del ticket en lugar
-- de simplemente borrar la fila.
--
-- Quitar un renglón obliga a:
--
--   1. Devolver los insumos que ESE renglón consumió.
--   2. Recalcular subtotal y total con los renglones que quedan.
--   3. Reajustar los puntos de lealtad al nuevo total.
--
-- El punto 1 es el delicado. `inventory_movements` guarda el consumo agregado
-- por insumo y por ticket, no por renglón, así que no se puede "restar el
-- movimiento del renglón": no existe tal cosa. Hay que recalcular el consumo
-- del renglón desde la receta, igual que hizo `create_order` al cobrar,
-- respetando el modo de servicio (el empaque sólo se gastó si fue para llevar)
-- y la leche que se eligió.
--
-- Si el renglón era el último, el ticket se queda vacío. Eso no se permite: un
-- ticket sin nada no significa nada, y para ese caso ya existe `delete_order`.
--
-- La propina se conserva tal cual la dejó el cliente. Recortarla porque se quitó
-- un renglón sería decidir por él cuánto quiso dar. Lo único que se hace es
-- respetar el tope: si el consumo baja por debajo de la propina, se recorta a lo
-- que quede, porque una propina mayor que la cuenta no puede existir.
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
  v_key       text;
  v_recipe    record;
  v_target    uuid;
  v_stock     numeric(12,2);
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
  -- Un ticket cancelado ya devolvió todo su consumo: volver a sumarlo dejaría
  -- las existencias infladas.
  if v_order.status <> 'cancelado' and v_settings.flag_inventario then
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
      update ingredients
         set stock = round(stock + (v_usage->>v_key)::numeric, 2)
       where id = v_key::uuid
      returning stock into v_stock;

      if found then
        insert into inventory_movements (ingredient_id, delta, stock_after, reason, order_id, staff_id, note)
        values (v_key::uuid, (v_usage->>v_key)::numeric, v_stock, 'cancelacion', v_order.id, p_staff_id,
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
  -- Los puntos se recalculan sobre el total nuevo y se ajusta la diferencia,
  -- para que el saldo del cliente refleje lo que realmente pagó.
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
