-- ============================================================================
-- cancel_order · anular un ticket ya cobrado
-- ----------------------------------------------------------------------------
-- En una barra real se equivocan: se cobra dos veces, el cliente cambia de
-- opinión, se tira la bebida. Anular tiene que devolver el inventario y quitar
-- los puntos que se otorgaron, todo de una sola pieza.
--
-- El ticket NO se borra: queda con estado `cancelado` para que el histórico y
-- los cortes de caja sigan siendo auditables.
-- ============================================================================

create or replace function cancel_order(p_order_id uuid, p_staff_id uuid default null)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_order   orders%rowtype;
  v_mov     record;
  v_stock   numeric(12,2);
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

  -- Devolución de insumos: se revierte exactamente lo que la venta consumió.
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

    if found then
      insert into inventory_movements (ingredient_id, delta, stock_after, reason, order_id, staff_id, note)
      values (v_mov.ingredient_id, -v_mov.delta, v_stock, 'cancelacion', p_order_id, p_staff_id,
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

revoke all on function cancel_order(uuid, uuid) from anon, authenticated;
