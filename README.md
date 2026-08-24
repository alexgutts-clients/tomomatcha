# TomoMatcha · sistema de operación

Sistema de operación para la cafetería **TomoMatcha**: punto de venta, comandas,
inventario por receta, reportes, lealtad con QR, corte de caja y configuración
del negocio.

No es una demostración. Los datos viven en una base de datos real, el acceso
requiere iniciar sesión y cada venta descuenta inventario y otorga puntos de
verdad.

> **Antes de usarlo por primera vez** hay que conectar tres servicios. El paso a
> paso está en **[INSTRUCCIONES.md](INSTRUCCIONES.md)**, y `npm run doctor`
> comprueba que todo quedó bien.

## Arquitectura

| Pieza | Servicio | Papel |
| --- | --- | --- |
| Aplicación | Next.js 15 (App Router) + React 19 | Interfaz y lógica de servidor |
| Base de datos | Supabase (PostgreSQL) | Productos, ventas, inventario, clientes, cortes |
| Autenticación | Clerk | Inicio de sesión y cuentas del equipo |
| Imágenes y media | Cloudflare R2 | Fotos de productos y logo |

### Cómo fluyen los datos

```
Navegador ──► Server Action de Next.js ──► Supabase (llave service_role)
             │                                    │
             │  1. Autoriza con la sesión de      │  RLS activa y sin
             │     Clerk + la tabla `staff`       │  políticas: las llaves
             │  2. Valida la entrada              │  públicas no leen nada
             │  3. Muta                           │
             └──► devuelve el estado completo recién leído de la base
```

Tres decisiones que vale la pena conocer antes de tocar el código:

- **La base de datos no se expone al navegador.** RLS está activa en todas las
  tablas y **sin ninguna política**, así que la llave pública de Supabase no
  puede leer ni escribir nada. El único camino es el servidor de Next.js, que
  usa la llave `service_role` y autoriza con la sesión de Clerk.
- **Los precios no se toman del cliente.** La función `create_order` de
  PostgreSQL relee precio, cargo de leche y precio de extras desde la base, así
  que un navegador manipulado no puede cambiar un total.
- **Cobrar es una sola transacción.** Crear el ticket, descontar insumos según la
  receta, registrar los movimientos y sumar puntos ocurren dentro de
  `create_order`: o queda todo, o no queda nada.

## Módulos

| Módulo | Ruta | Acceso |
| --- | --- | --- |
| Inicio (resumen del día) | `/inicio` | Administrador |
| Punto de venta | `/pos` | Ambos perfiles |
| Comandas (tablero de barra) | `/comandas` | Ambos perfiles |
| Inventario de insumos | `/inventario` | Administrador · módulo |
| Productos y recetas | `/productos` | Administrador |
| Reportes | `/reportes` | Administrador |
| Clientes y lealtad | `/clientes` | Administrador · módulo |
| Corte de caja | `/corte` | Administrador |
| Ajustes | `/ajustes` | Administrador |
| Tarjeta del cliente | `/tarjeta/<token>` | Público (por QR) |

Al **cobrar** se crea la comanda, se descuenta el inventario según la receta del
producto (incluida la leche elegida), se suman los puntos de lealtad y se
actualizan el panel, los reportes y el corte de caja.

## Perfiles y acceso

Las cuentas se crean iniciando sesión con Clerk, pero **no tienen acceso hasta
que un administrador las active** en Ajustes → Equipo. Esto es a propósito:
registrarse no debe alcanzar para entrar a la caja.

- **Administrador**: acceso a todos los módulos y a la configuración.
- **Empleado**: sólo Punto de venta y Comandas.

El primer usuario que inicia sesión queda como administrador activo. También
puedes fijar administradores por correo con `BOOTSTRAP_ADMIN_EMAILS`.

## Módulos que se pueden apagar

Desde Ajustes, y afectan el comportamiento real, no sólo la interfaz:

- **Inventario de insumos** — apagado, las ventas dejan de descontar stock.
- **Lealtad y clientes** — apagado, no se otorgan puntos ni se elige cliente al cobrar.
- **Reseñas de Google** — muestra el QR para dejar reseña y la calificación.
- **Pagos con Mercado Pago** — añade el método al cobro; el registro es manual
  (la aplicación no procesa el pago, lo contabiliza en el corte).

## Poner en marcha

```bash
npm install
cp .env.example .env.local     # y llenarlo — ver INSTRUCCIONES.md
npm run doctor                 # comprueba Supabase, Clerk y R2
npm run dev                    # http://localhost:3000
```

Validación antes de desplegar:

```bash
npm run lint
npm run build
```

## Base de datos

El esquema vive en `supabase/migrations/` y es la única fuente de verdad:

| Migración | Qué hace |
| --- | --- |
| `20260824000001_core_schema.sql` | Tablas, índices, enums y bloqueo de RLS |
| `20260824000002_rpc.sql` | `create_order`, `close_cash`, `adjust_stock`, `adjust_points`, `business_day` |
| `20260824000003_cancel_order.sql` | Anulación de tickets con devolución de insumos y puntos |
| `20260824000004_harden_function_grants.sql` | Quita `EXECUTE` a `PUBLIC` sobre las funciones |

`lib/database.types.ts` es el espejo en TypeScript del esquema. **Al cambiar una
migración hay que actualizarlo**, o el tipado dejará de proteger.

### Catálogo inicial

La base arranca vacía a propósito: no hay datos de ejemplo. Para no capturar 26
insumos y 22 productos a mano el primer día, Ajustes ofrece **cargar el catálogo
sugerido** de TomoMatcha (`lib/catalog.ts`), que después se edita libremente. Las
existencias arrancan en cero porque el inventario real se captura contando la
barra, no adivinando.

## Estructura del código

```
app/
  (app)/            Módulos con sesión (layout carga el estado y lo inyecta)
  sign-in, sign-up  Pantallas de Clerk
  tarjeta/[token]   Tarjeta pública de lealtad (destino del QR)
  api/health        Estado de las conexiones (usado por `npm run doctor`)
  api/media/[...]   Sirve archivos de R2 cuando no hay dominio público
  api/qr            Genera códigos QR reales en SVG
components/
  app-shell.tsx     Navegación, sesión y avisos
  ui.tsx            Sistema de componentes
  modules/          Un archivo por módulo
lib/
  types.ts          Tipos de dominio
  database.types.ts Espejo del esquema de Supabase
  env.ts            Lectura de variables y estado de cada servicio
  supabase.ts       Cliente de servidor (service_role) · server-only
  auth.ts           Clerk + tabla `staff` → quién puede hacer qué
  data.ts           `loadAppState`: todo lo que necesita la interfaz
  actions.ts        Operación diaria (cobrar, comandas, inventario, caja)
  actions-admin.ts  Carta, ajustes, equipo y media
  action-utils.ts   Validación y envoltura común de las acciones
  r2.ts             Cloudflare R2 (URLs firmadas)
  store.tsx         Estado en el navegador y sincronización con el servidor
  catalog.ts        Catálogo inicial sugerido (opcional)
scripts/doctor.mjs  Revisión de conexiones
```

## Detalles de operación

- **Día operativo y zona horaria.** El corte de caja y las métricas del día usan
  la zona horaria configurada en Ajustes, no la del navegador. Un panel abierto
  desde otro huso horario ve exactamente el mismo día que la barra.
- **Sincronización entre dispositivos.** La caja y el tablero de comandas se
  refrescan solos cada 15 segundos mientras la pestaña está visible, y cada
  mutación devuelve el estado recién leído de la base.
- **Ventana de datos del panel.** Se cargan las ventas de los últimos días (más
  todas las comandas abiertas), no el histórico completo, para que la aplicación
  siga siendo rápida con los años. El histórico completo está en la base.
- **Auditoría.** Cada movimiento de inventario y cada movimiento de puntos queda
  registrado en `inventory_movements` y `loyalty_transactions`, con quién y por
  qué.
- **Anular un ticket** devuelve los insumos y retira los puntos, y sólo se puede
  antes de cerrar el corte de ese día.

## Despliegue

Pensado para Vercel, pero funciona en cualquier hosting con Node.

1. Importar el repositorio (framework: **Next.js**, detección automática).
2. Cargar las variables de entorno de `.env.example`.
3. Desplegar.
4. Abrir `/api/health` para confirmar que los servicios responden.

Si `NEXT_PUBLIC_APP_URL` no está definida, en Vercel se deduce del dominio del
despliegue.

## Alcance actual

- Los pagos con tarjeta y Mercado Pago se **registran**, no se procesan: no hay
  integración con terminal ni con la API de Mercado Pago. El corte los separa
  para conciliarlos contra el estado de cuenta.
- La calificación de Google se captura a mano en Ajustes; el QR de reseñas sí es
  real y escaneable. Sincronizar reseñas automáticamente requeriría la API de
  Google Business Profile.
- La aplicación está pensada para una sucursal. El esquema soportaría varias,
  pero la interfaz todavía no las distingue.
