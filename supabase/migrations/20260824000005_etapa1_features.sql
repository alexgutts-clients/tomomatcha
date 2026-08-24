-- ============================================================================
-- Etapa 1 · funcionalidades acordadas en la reunión del 12 de agosto
-- ----------------------------------------------------------------------------
--  · Pedido "para aquí" vs "para llevar": el empaque (vasos, tapas, servilletas)
--    solo se descuenta cuando el cliente se lo lleva.
--  · Nivel objetivo por insumo, para poder fijar la alerta como porcentaje.
--  · Productos preparados en casa con fecha de caducidad y alerta persistente.
-- ============================================================================

/* ------------------------------ Insumos ---------------------------------- */

-- `is_packaging` marca vasos, tapas, servilletas y demás desechables: son los
-- únicos insumos que dependen de si el pedido es para llevar.
alter table ingredients
  add column if not exists is_packaging boolean not null default false;

-- Nivel objetivo de resurtido. Sirve para expresar el umbral como porcentaje
-- ("avísame cuando el matcha baje al 50%"), que fue justo lo que pidió el
-- cliente para los insumos importados.
alter table ingredients
  add column if not exists par_level numeric(12,2);

/* ------------------------------- Pedidos --------------------------------- */

do $$ begin
  create type service_mode as enum ('aqui', 'llevar');
exception when duplicate_object then null; end $$;

alter table orders
  add column if not exists service_mode service_mode not null default 'llevar';

/* -------------------------- Productos preparados -------------------------- */
-- Mermeladas, jarabes, roles, pasteles: productos terminados que se elaboran en
-- casa. No son insumos de receta; lo que importa de ellos es la caducidad.
create table if not exists prepared_items (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,
  qty             numeric(12,2) not null default 0,
  unit            unit_type   not null default 'pza',
  produced_on     date        not null default current_date,
  expires_on      date        not null,
  notes           text,
  -- La alerta del último día no desaparece sola: sigue ahí hasta que un
  -- administrador la atiende (confirma que se usó, o desecha el lote).
  acknowledged_at timestamptz,
  acknowledged_by uuid references staff (id) on delete set null,
  discarded_at    timestamptz,
  created_by      uuid references staff (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint prepared_items_dates check (expires_on >= produced_on)
);
create index if not exists prepared_items_expires_idx on prepared_items (expires_on);
create index if not exists prepared_items_open_idx on prepared_items (discarded_at) where discarded_at is null;

drop trigger if exists prepared_items_updated_at on prepared_items;
create trigger prepared_items_updated_at before update on prepared_items
  for each row execute function set_updated_at();

alter table prepared_items enable row level security;
alter table prepared_items force row level security;
revoke all on table prepared_items from anon, authenticated;
