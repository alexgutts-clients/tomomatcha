-- ============================================================================
-- TomoMatcha · categorías editables
-- ----------------------------------------------------------------------------
-- Hasta aquí las categorías eran un enum de Postgres ('matcha', 'cafe', 'te',
-- 'bakery'): añadir una — mercancía, tazas, matcha en polvo para llevar —
-- exigía una migración y un despliegue. La cafetería vende más que bebidas, así
-- que la categoría deja de ser una constante del código y pasa a ser un dato
-- que el administrador edita desde Productos.
--
-- El identificador es un slug de texto, no un uuid, porque ya hay filas en
-- `products` que guardan 'matcha' o 'cafe': convertir el enum a texto conserva
-- esos valores tal cual y la llave foránea los ata a la tabla nueva sin tocar
-- una sola venta.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- categories · secciones de la carta
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id         text        primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  label      text        not null,
  emoji      text        not null default '🏷️',
  sort_order integer     not null default 0,
  -- Una categoría apagada deja de ofrecerse (no aparece como filtro en el punto
  -- de venta ni como opción al crear un producto), pero sus productos siguen
  -- vendiéndose. Apagar una sección no puede tumbar la carta en silencio.
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists categories_label_key on categories (lower(label));
create index if not exists categories_order_idx on categories (sort_order, label);

-- RLS activa y sin políticas, como el resto del esquema: la llave pública no
-- puede leer ni escribir; el único acceso es el servidor con `service_role`.
alter table categories enable row level security;
alter table categories force row level security;
revoke all on table categories from anon, authenticated;

drop trigger if exists categories_updated_at on categories;
create trigger categories_updated_at before update on categories
  for each row execute function set_updated_at();

-- Las cuatro categorías del enum original, para que la carta que ya existe siga
-- apuntando a algo. A partir de aquí se editan como cualquier otro dato.
insert into categories (id, label, emoji, sort_order) values
  ('matcha', 'Matcha',           '🍵', 0),
  ('cafe',   'Café',             '☕', 1),
  ('te',     'Té e infusiones',  '🫖', 2),
  ('bakery', 'Bakery',           '🥐', 3)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- products.category · de enum a llave foránea
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'products'
      and column_name  = 'category'
      and udt_name     = 'category_id'
  ) then
    -- El default 'matcha' desaparece: si el administrador borra esa categoría,
    -- un default inválido rompería cualquier alta. La aplicación siempre manda
    -- la categoría, así que `not null` sin default es la regla honesta.
    alter table products alter column category drop default;
    alter table products alter column category type text using category::text;
  end if;
end $$;

-- Cualquier valor huérfano (una categoría que ya no exista) se rescata antes de
-- poner la llave foránea, para que la migración no falle a medio camino.
insert into categories (id, label, emoji, sort_order)
select distinct p.category, initcap(p.category), '🏷️', 90
from products p
where not exists (select 1 from categories c where c.id = p.category)
on conflict do nothing;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_fkey'
  ) then
    alter table products
      add constraint products_category_fkey
      foreign key (category) references categories (id)
      on update cascade on delete restrict;
  end if;
end $$;

-- El enum ya no lo usa nadie.
drop type if exists category_id;
