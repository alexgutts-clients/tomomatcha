-- ============================================================================
-- TomoMatcha · histórico de ventas
-- ----------------------------------------------------------------------------
-- El panel sólo carga los últimos días (`ORDER_WINDOW_DAYS` en `lib/data.ts`)
-- para seguir siendo ligero cuando la cafetería lleve años vendiendo. Pero el
-- dueño necesita poder mirar el mes pasado o el año completo, y bajarse todas
-- las ventas al navegador para sumarlas allí sería justo lo que esa ventana
-- evita.
--
-- Por eso la suma se hace aquí: `sales_history` recorre `orders` en la base,
-- agrupa por día, semana, mes o año en la zona horaria del negocio —la misma
-- que decide el día operativo del corte— y devuelve ya resumido lo que pinta
-- Reportes, más una página de tickets para el detalle.
--
-- La zona horaria no se recibe como parámetro: se lee de `settings`, igual que
-- hace `business_day()`. Si el navegador pudiera elegirla, dos personas verían
-- cortes distintos del mismo día.
--
-- Los tickets anulados nunca suman dinero, pero sí se cuentan: una cancelación
-- es información (alguien se arrepintió) aunque no sea una venta. Por eso el
-- resumen siempre los cuenta y `p_include_cancelled` decide únicamente si
-- aparecen en la lista de tickets.
-- ============================================================================

create or replace function sales_history(
  p_from date default null,
  p_to date default null,
  p_bucket text default 'dia',
  p_payment payment_method default null,
  p_include_cancelled boolean default false,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_tz     text;
  v_trunc  text;
  v_step   interval;
  v_limit  integer;
  v_offset integer;
  v_from   timestamptz;
  v_to     timestamptz;
  v_result jsonb;
begin
  select coalesce(nullif(trim(timezone), ''), 'UTC') into v_tz from settings where id = 1;
  v_tz := coalesce(v_tz, 'UTC');

  -- El agrupamiento llega en español desde la interfaz y se traduce aquí: así
  -- `date_trunc` nunca recibe texto del navegador sin pasar por esta lista.
  v_trunc := case lower(coalesce(p_bucket, 'dia'))
               when 'semana' then 'week'
               when 'mes'    then 'month'
               when 'ano'    then 'year'
               else 'day'
             end;
  v_step := case v_trunc
              when 'week'  then interval '1 week'
              when 'month' then interval '1 month'
              when 'year'  then interval '1 year'
              else interval '1 day'
            end;

  -- Un tope duro: ninguna consulta del histórico puede pedir más renglones que
  -- esto, venga de donde venga la petición.
  v_limit  := least(greatest(coalesce(p_limit, 50), 1), 5000);
  v_offset := greatest(coalesce(p_offset, 0), 0);

  -- Los extremos llegan como días operativos (YYYY-MM-DD). Se convierten al
  -- instante real con la zona del negocio —medianoche local, no UTC— y se
  -- comparan contra `created_at`, que es la columna indexada.
  v_from := case when p_from is null then null else (p_from::timestamp) at time zone v_tz end;
  v_to   := case when p_to   is null then null else ((p_to + 1)::timestamp) at time zone v_tz end;

  with filtered as (
    select o.id, o.folio, o.created_at, o.subtotal, o.discount_pct, o.discount_label,
           o.tip, o.total, o.payment, o.status, o.service_mode,
           o.customer_name, o.created_by_name,
           (date_trunc(v_trunc, o.created_at at time zone v_tz))::date as bucket_key
      from orders o
     where (v_from is null or o.created_at >= v_from)
       and (v_to   is null or o.created_at <  v_to)
       and (p_payment is null or o.payment = p_payment)
  ),
  units as (
    select oi.order_id, sum(oi.qty)::integer as units
      from order_items oi
     where oi.order_id in (select id from filtered)
     group by oi.order_id
  ),
  sales as (
    select f.*, coalesce(u.units, 0) as units
      from filtered f
      left join units u on u.order_id = f.id
  ),
  buckets as (
    select s.bucket_key,
           (s.bucket_key + v_step - interval '1 day')::date as bucket_end,
           count(*) filter (where s.status <> 'cancelado')::integer as tickets,
           count(*) filter (where s.status =  'cancelado')::integer as cancelados,
           coalesce(sum(s.units)    filter (where s.status <> 'cancelado'), 0)::integer as units,
           coalesce(sum(s.subtotal) filter (where s.status <> 'cancelado'), 0) as subtotal,
           -- Descuento concedido: lo que el consumo habría costado a precio de
           -- lista menos lo que se cobró por él (la propina no es consumo).
           coalesce(sum(s.subtotal - s.total + s.tip) filter (where s.status <> 'cancelado'), 0) as discount,
           coalesce(sum(s.tip)      filter (where s.status <> 'cancelado'), 0) as tip,
           coalesce(sum(s.total)    filter (where s.status <> 'cancelado'), 0) as total,
           coalesce(sum(s.total) filter (where s.status <> 'cancelado' and s.payment = 'efectivo'), 0) as efectivo,
           coalesce(sum(s.total) filter (where s.status <> 'cancelado' and s.payment = 'tarjeta'), 0) as tarjeta,
           coalesce(sum(s.total) filter (where s.status <> 'cancelado' and s.payment = 'mercadopago'), 0) as mercadopago
      from sales s
     group by s.bucket_key
  ),
  page as (
    select s.*
      from sales s
     where coalesce(p_include_cancelled, false) or s.status <> 'cancelado'
     order by s.created_at desc
     limit v_limit offset v_offset
  ),
  page_items as (
    select oi.order_id,
           jsonb_agg(
             jsonb_build_object(
               'name', oi.name,
               'emoji', oi.emoji,
               'qty', oi.qty,
               'amount', round((oi.unit_price + oi.mods_price) * oi.qty, 2)
             ) order by oi.line_no
           ) as items
      from order_items oi
     where oi.order_id in (select id from page)
     group by oi.order_id
  ),
  -- Más vendidos del rango. Se agrupa por producto cuando el renglón todavía
  -- apunta a uno y, si no, por el nombre que quedó grabado en el ticket: un
  -- producto borrado del menú sí se vendió, y esconderlo descuadraría el total.
  top_products as (
    select coalesce(oi.product_id::text, 'nombre:' || lower(oi.name)) as key,
           max(oi.product_id::text)                                   as product_id,
           (array_agg(oi.name  order by oi.qty desc))[1]              as name,
           (array_agg(oi.emoji order by oi.qty desc))[1]              as emoji,
           sum(oi.qty)::integer                                       as qty,
           round(sum((oi.unit_price + oi.mods_price) * oi.qty), 2)    as revenue
      from order_items oi
      join sales s on s.id = oi.order_id and s.status <> 'cancelado'
     group by 1
     order by qty desc
     limit 15
  )
  select jsonb_build_object(
    'tz', v_tz,
    'bucket', lower(coalesce(p_bucket, 'dia')),
    'from', p_from,
    'to', p_to,
    'limit', v_limit,
    'offset', v_offset,
    -- Con qué día empieza y termina el histórico completo: la interfaz lo usa
    -- para ofrecer «todo» sin adivinar fechas.
    'firstSaleDay', (select (min(created_at) at time zone v_tz)::date from orders),
    'lastSaleDay',  (select (max(created_at) at time zone v_tz)::date from orders),
    -- Cuántos tickets puede recorrer la lista: es lo que pagina la interfaz,
    -- así que sigue el mismo criterio que `page` sobre los anulados.
    'orderCount',   (
      select count(*) from sales
       where coalesce(p_include_cancelled, false) or status <> 'cancelado'
    ),
    'totals', (
      select jsonb_build_object(
        'tickets',    count(*) filter (where status <> 'cancelado'),
        'cancelados', count(*) filter (where status =  'cancelado'),
        'units',      coalesce(sum(units)    filter (where status <> 'cancelado'), 0),
        'subtotal',   coalesce(sum(subtotal) filter (where status <> 'cancelado'), 0),
        'discount',   coalesce(sum(subtotal - total + tip) filter (where status <> 'cancelado'), 0),
        'tip',        coalesce(sum(tip)      filter (where status <> 'cancelado'), 0),
        'total',      coalesce(sum(total)    filter (where status <> 'cancelado'), 0),
        'efectivo',   coalesce(sum(total) filter (where status <> 'cancelado' and payment = 'efectivo'), 0),
        'tarjeta',    coalesce(sum(total) filter (where status <> 'cancelado' and payment = 'tarjeta'), 0),
        'mercadopago',coalesce(sum(total) filter (where status <> 'cancelado' and payment = 'mercadopago'), 0)
      )
      from sales
    ),
    'buckets', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'key', b.bucket_key,
                 'end', b.bucket_end,
                 'tickets', b.tickets,
                 'cancelados', b.cancelados,
                 'units', b.units,
                 'subtotal', b.subtotal,
                 'discount', b.discount,
                 'tip', b.tip,
                 'total', b.total,
                 'efectivo', b.efectivo,
                 'tarjeta', b.tarjeta,
                 'mercadopago', b.mercadopago
               ) order by b.bucket_key
             )
        from buckets b
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', p.id,
                 'folio', p.folio,
                 'createdAt', p.created_at,
                 'status', p.status,
                 'payment', p.payment,
                 'serviceMode', p.service_mode,
                 'subtotal', p.subtotal,
                 'discountPct', p.discount_pct,
                 'discountLabel', p.discount_label,
                 'tip', p.tip,
                 'total', p.total,
                 'units', p.units,
                 'customerName', p.customer_name,
                 'createdByName', p.created_by_name,
                 'items', coalesce(pi.items, '[]'::jsonb)
               ) order by p.created_at desc
             )
        from page p
        left join page_items pi on pi.order_id = p.id
    ), '[]'::jsonb),
    'topProducts', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'productId', t.product_id,
                 'name', t.name,
                 'emoji', t.emoji,
                 'qty', t.qty,
                 'revenue', t.revenue
               ) order by t.qty desc
             )
        from top_products t
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

-- Mismo endurecimiento que el resto de funciones (`…0004`): sólo el servidor.
revoke all on function sales_history(date, date, text, payment_method, boolean, integer, integer) from public;
revoke all on function sales_history(date, date, text, payment_method, boolean, integer, integer) from anon, authenticated;
grant execute on function sales_history(date, date, text, payment_method, boolean, integer, integer) to service_role, postgres;
