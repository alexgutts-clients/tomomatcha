-- ============================================================================
-- TomoMatcha · esquema base de producción
-- ----------------------------------------------------------------------------
-- Toda la aplicación accede a estas tablas desde el servidor de Next.js con la
-- llave `service_role`. RLS queda ACTIVA y SIN políticas: las llaves públicas
-- (anon / publishable) no pueden leer ni escribir nada. La autorización real la
-- aplica la capa de servidor a partir de la sesión de Clerk (tabla `staff`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type staff_role as enum ('admin', 'empleado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unit_type as enum ('g', 'ml', 'pza');
exception when duplicate_object then null; end $$;

do $$ begin
  create type category_id as enum ('matcha', 'cafe', 'te', 'bakery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('nuevo', 'preparando', 'listo', 'entregado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('efectivo', 'tarjeta', 'mercadopago');
exception when duplicate_object then null; end $$;

do $$ begin
  create type movement_reason as enum ('venta', 'ajuste', 'entrada', 'merma', 'cancelacion');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- staff · usuarios de Clerk autorizados a operar
-- ---------------------------------------------------------------------------
create table if not exists staff (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text        not null unique,
  email         text,
  full_name     text,
  image_url     text,
  role          staff_role  not null default 'empleado',
  active        boolean     not null default false,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists staff_active_idx on staff (active, role);

drop trigger if exists staff_updated_at on staff;
create trigger staff_updated_at before update on staff
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- settings · fila única con la configuración del negocio
-- ---------------------------------------------------------------------------
create table if not exists settings (
  id                    smallint primary key default 1 check (id = 1),
  business_name         text        not null default 'TomoMatcha',
  branch_name           text        not null default 'Sucursal principal',
  timezone              text        not null default 'America/Mexico_City',
  currency              text        not null default 'MXN',
  logo_key              text,
  cash_float            numeric(12,2) not null default 0,
  points_per_currency   numeric(6,2)  not null default 1,
  reward_cost           integer     not null default 500,
  flag_inventario       boolean     not null default true,
  flag_lealtad          boolean     not null default true,
  flag_resenas_google   boolean     not null default false,
  flag_mercadopago      boolean     not null default false,
  google_review_url     text,
  google_rating         numeric(2,1),
  google_reviews_count  integer,
  next_folio            integer     not null default 1,
  catalog_seeded_at     timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists settings_updated_at on settings;
create trigger settings_updated_at before update on settings
  for each row execute function set_updated_at();

insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ingredients · insumos con stock
-- ---------------------------------------------------------------------------
create table if not exists ingredients (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  unit        unit_type   not null default 'g',
  stock       numeric(12,2) not null default 0,
  min_stock   numeric(12,2) not null default 0,
  weekly_use  numeric(12,2) not null default 0,
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists ingredients_name_key on ingredients (lower(name));
create index if not exists ingredients_active_idx on ingredients (active);

drop trigger if exists ingredients_updated_at on ingredients;
create trigger ingredients_updated_at before update on ingredients
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- milk_options · leches disponibles en toda la carta
-- ---------------------------------------------------------------------------
create table if not exists milk_options (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  surcharge     numeric(12,2) not null default 0,
  ingredient_id uuid references ingredients (id) on delete set null,
  available     boolean     not null default true,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists milk_options_name_key on milk_options (lower(name));

drop trigger if exists milk_options_updated_at on milk_options;
create trigger milk_options_updated_at before update on milk_options
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- extras · complementos de toda la carta
-- ---------------------------------------------------------------------------
create table if not exists extras (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  price       numeric(12,2) not null default 0,
  available   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists extras_name_key on extras (lower(name));

drop trigger if exists extras_updated_at on extras;
create trigger extras_updated_at before update on extras
  for each row execute function set_updated_at();

create table if not exists extra_recipe_items (
  id            uuid primary key default gen_random_uuid(),
  extra_id      uuid not null references extras (id) on delete cascade,
  ingredient_id uuid not null references ingredients (id) on delete cascade,
  qty           numeric(12,3) not null check (qty > 0),
  unique (extra_id, ingredient_id)
);
create index if not exists extra_recipe_items_extra_idx on extra_recipe_items (extra_id);

-- ---------------------------------------------------------------------------
-- products · carta
-- ---------------------------------------------------------------------------
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  category      category_id not null default 'matcha',
  price         numeric(12,2) not null default 0 check (price >= 0),
  description   text        not null default '',
  emoji         text        not null default '🍵',
  image_key     text,
  active        boolean     not null default true,
  popular       boolean     not null default false,
  sort_order    integer     not null default 0,
  mod_milk        boolean   not null default false,
  mod_sweetness   boolean   not null default false,
  mod_temperature boolean   not null default false,
  mod_extras      boolean   not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists products_name_key on products (lower(name));
create index if not exists products_active_idx on products (active, category);

drop trigger if exists products_updated_at on products;
create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

-- Receta: `is_milk` marca el renglón que se resuelve con la leche elegida en el
-- punto de venta; en ese caso `ingredient_id` va nulo.
create table if not exists product_recipe_items (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  ingredient_id uuid references ingredients (id) on delete cascade,
  is_milk       boolean not null default false,
  qty           numeric(12,3) not null check (qty > 0),
  constraint recipe_item_target check (
    (is_milk and ingredient_id is null) or (not is_milk and ingredient_id is not null)
  )
);
create index if not exists product_recipe_items_product_idx on product_recipe_items (product_id);
create unique index if not exists product_recipe_items_milk_key
  on product_recipe_items (product_id) where is_milk;
create unique index if not exists product_recipe_items_ingredient_key
  on product_recipe_items (product_id, ingredient_id) where not is_milk;

-- ---------------------------------------------------------------------------
-- customers · lealtad
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  phone       text,
  email       text,
  notes       text,
  points      integer     not null default 0 check (points >= 0),
  visits      integer     not null default 0 check (visits >= 0),
  card_token  text        not null unique default encode(gen_random_bytes(12), 'hex'),
  since       date        not null default current_date,
  last_visit  timestamptz,
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists customers_last_visit_idx on customers (last_visit desc nulls last);
create index if not exists customers_name_idx on customers (lower(name));
create unique index if not exists customers_phone_key on customers (phone) where phone is not null and phone <> '';

drop trigger if exists customers_updated_at on customers;
create trigger customers_updated_at before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- orders · tickets
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  folio         integer     not null unique,
  subtotal      numeric(12,2) not null default 0,
  discount_pct  numeric(5,2)  not null default 0,
  discount_label text,
  total         numeric(12,2) not null default 0,
  payment       payment_method not null default 'efectivo',
  status        order_status   not null default 'nuevo',
  cash_received numeric(12,2),
  customer_id   uuid references customers (id) on delete set null,
  customer_name text,
  points_earned integer,
  created_by    uuid references staff (id) on delete set null,
  created_by_name text,
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz,
  updated_at    timestamptz not null default now()
);
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status) where status <> 'entregado';
create index if not exists orders_customer_idx on orders (customer_id);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- Los renglones guardan una foto del producto en el momento de la venta: si
-- mañana cambia el precio o el nombre, el histórico no se altera.
create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders (id) on delete cascade,
  product_id  uuid references products (id) on delete set null,
  name        text        not null,
  emoji       text        not null default '🍵',
  image_key   text,
  qty         integer     not null check (qty > 0),
  unit_price  numeric(12,2) not null default 0,
  mods_price  numeric(12,2) not null default 0,
  modifiers   jsonb       not null default '{}'::jsonb,
  line_no     integer     not null default 0
);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_product_idx on order_items (product_id);

-- ---------------------------------------------------------------------------
-- inventory_movements · bitácora de stock
-- ---------------------------------------------------------------------------
create table if not exists inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients (id) on delete cascade,
  delta         numeric(12,3) not null,
  stock_after   numeric(12,2) not null,
  reason        movement_reason not null default 'ajuste',
  order_id      uuid references orders (id) on delete set null,
  staff_id      uuid references staff (id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists inventory_movements_ingredient_idx
  on inventory_movements (ingredient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- loyalty_transactions · bitácora de puntos
-- ---------------------------------------------------------------------------
create table if not exists loyalty_transactions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  points      integer not null,
  balance_after integer not null,
  reason      text    not null default '',
  order_id    uuid references orders (id) on delete set null,
  staff_id    uuid references staff (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists loyalty_transactions_customer_idx
  on loyalty_transactions (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- cash_closes · cortes de caja
-- ---------------------------------------------------------------------------
create table if not exists cash_closes (
  id            uuid primary key default gen_random_uuid(),
  date_key      date        not null unique,
  closed_at     timestamptz not null default now(),
  expected_cash numeric(12,2) not null default 0,
  expected_card numeric(12,2) not null default 0,
  counted_cash  numeric(12,2) not null default 0,
  difference    numeric(12,2) not null default 0,
  orders_count  integer     not null default 0,
  notes         text,
  closed_by     uuid references staff (id) on delete set null,
  closed_by_name text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists cash_closes_date_idx on cash_closes (date_key desc);

-- ---------------------------------------------------------------------------
-- media_assets · archivos en Cloudflare R2
-- ---------------------------------------------------------------------------
create table if not exists media_assets (
  id            uuid primary key default gen_random_uuid(),
  object_key    text        not null unique,
  bucket        text        not null default '',
  purpose       text        not null default 'producto',
  content_type  text        not null default 'application/octet-stream',
  size_bytes    bigint      not null default 0,
  original_name text,
  uploaded_by   uuid references staff (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists media_assets_purpose_idx on media_assets (purpose, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: activa y sin políticas. Solo `service_role` (que la omite) tiene acceso.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'staff', 'settings', 'ingredients', 'milk_options', 'extras',
    'extra_recipe_items', 'products', 'product_recipe_items', 'customers',
    'orders', 'order_items', 'inventory_movements', 'loyalty_transactions',
    'cash_closes', 'media_assets'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;
