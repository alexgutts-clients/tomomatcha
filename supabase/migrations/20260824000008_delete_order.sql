-- ============================================================================
-- delete_order · borrar una venta de verdad
-- ----------------------------------------------------------------------------
-- `cancel_order` deja el ticket con estado `cancelado` porque en la operación
-- diaria eso es lo correcto: la venta ocurrió y el histórico tiene que poder
-- explicarla. Esto es otra cosa. Sirve para limpiar datos de prueba, y por eso
-- borra el renglón de la base en lugar de marcarlo.
--
-- El orden importa, y es el mismo que sigue una cancelación:
--
--   1. Devolver los insumos que la venta descontó.
--   2. Retirar los puntos que otorgó.
--   3. Borrar el ticket.
--
-- Si se borrara primero, `inventory_movements.order_id` se pondría en null (la
-- llave es `on delete set null`) y ya no habría forma de saber cuánto devolver:
-- el stock quedaría mal para siempre y nadie se enteraría.
--
-- Borrar una venta es lo que después permite borrar el producto que se vendió,
-- y luego el insumo de su receta. Ese encadenamiento es justo el punto: durante
-- las pruebas se captura mucho y hay que poder deshacerlo entero.
--
-- Se prohíbe si el día del ticket ya tiene corte cerrado, por la misma razón
-- que en la cancelación: el corte afirma cuánto se vendió ese día, y quitarle
-- una venta por debajo lo convierte en mentira.
-- ============================================================================

create or replace function delete_order(p_order_id uuid, p_staff_id uuid default null)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_order   orders%rowtype;
  v_folio   integer;
  v_mov     record;
  v_stock   numeric(12,2);
  v_balance integer;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'El ticket no existe';
  end if;

  if exists (select 1 from cash_closes where date_key = business_day(v_order.created_at)) then
    raise exception 'El corte del día de este ticket ya se cerró; borrarlo descuadraría la caja';
  end if;

  v_folio := v_order.folio;

  -- Devolución de insumos. Un ticket ya cancelado no devuelve nada: sus
  -- movimientos de venta ya fueron revertidos por `cancel_order`, y volver a
  -- sumarlos dejaría existencias infladas.
  if v_order.status <> 'cancelado' then
    for v_mov in
      select ingredient_id, sum(delta) as delta
        from inventory_movements
       where order_id = p_order_id and reason = 'venta'
       group by ingredient_id
    loop
      update ingredients
         set stock = greatest(0, round(stock - v_mov.delta, 2))
       where id = v_mov.ingredient_id
      returning stock into v_stock;
    end loop;

    -- Retiro de los puntos otorgados por esta compra.
    if v_order.customer_id is not null and coalesce(v_order.points_earned, 0) <> 0 then
      update customers
         set points = greatest(0, points - v_order.points_earned),
             visits = greatest(0, visits - 1)
       where id = v_order.customer_id
      returning points into v_balance;
    end if;
  end if;

  -- La bitácora de este ticket se va con él: si el ticket no existe, un
  -- movimiento que lo menciona no le sirve a nadie para auditar.
  delete from inventory_movements where order_id = p_order_id;
  delete from loyalty_transactions where order_id = p_order_id;

  -- `order_items` cae en cascada.
  delete from orders where id = p_order_id;

  return v_folio;
end;
$$;

revoke all on function delete_order(uuid, uuid) from public;
revoke all on function delete_order(uuid, uuid) from anon, authenticated;
grant execute on function delete_order(uuid, uuid) to service_role, postgres;
