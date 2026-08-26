# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint . --max-warnings=0  (zero-warning policy)
npm run doctor   # scripts/doctor.mjs — verifies Supabase, Clerk and R2 connections
```

There is no test suite. Validation before deploying is `npm run lint && npm run build`.
`npm run doctor` reads `.env.local` itself and reports which env vars are missing per service; it never mutates anything. `/api/health` is the deployed equivalent.

## Language conventions

The product is Spanish-only and so is the code's vocabulary. Comments, JSDoc, user-facing strings, error messages, route segments (`/inicio`, `/pos`, `/comandas`, `/inventario`, `/preparados`, `/productos`, `/reportes`, `/clientes`, `/corte`, `/ajustes`, `/tarjeta`), and domain enum values (`admin` / `empleado`, `llevar` / `aqui`) are Spanish. Identifiers, types and function names are English. Match this when adding code — do not translate existing Spanish strings to English.

Comment style is a distinctive part of this codebase: each module opens with a boxed `/* ===== */` header explaining *why* the module exists and what decision it encodes, not what it does. Preserve that when editing.

## Architecture

Next.js 15 App Router + React 19, Supabase (Postgres), Clerk (auth), Cloudflare R2 (media). No ORM — the Supabase JS client plus hand-written SQL.

### The one data path

```
Browser → Server Action → lib/action-utils.run() → Supabase (service_role) → full fresh AppState back
```

Everything mutating flows through `run(guard, body)` in `lib/action-utils.ts`. It:
1. Runs the guard (`requireStaff` / `requireAdmin`) — authorization happens *before* any DB work.
2. Runs the body.
3. Re-reads the entire app state via `loadAppState(staff)` and returns it inside `ActionResult<T>`.
4. Translates every thrown error into a Spanish message; exceptions never reach the browser.

`ActionResult<T>` is `{ ok: true; state; data }` or `{ ok: false; error; kind }`. Any new server action must return this shape and go through `run` (or `readState` for pure reads) — do not write a bare server action.

### Security model — do not weaken these

- **RLS is enabled on every table with zero policies.** The Supabase anon key can read and write nothing. The only access path is the Next.js server using `service_role`, which bypasses RLS. `lib/supabase.ts` and `lib/auth.ts` are `import "server-only"` for this reason; keep that import on any module touching the DB.
- **Prices are never taken from the client.** The `create_order` Postgres function re-reads product price, milk surcharge and extra price from the DB. A checkout payload carries ids and quantities only.
- **Checkout is one transaction.** Ticket creation, recipe-based stock decrement, inventory movements and loyalty points all happen inside `create_order` — all or nothing. Never split this into separate client-orchestrated calls.
- **Clerk identity ≠ authorization.** Clerk says who you are; the `staff` table says what you may do. New users land as `empleado` with `active = false` and see a waiting screen until an admin activates them (the Clerk instance may be shared with other projects). First-ever user, and any email in `BOOTSTRAP_ADMIN_EMAILS`, is auto-promoted to an active admin.
- All input passes through the validators in `lib/action-utils.ts` (`reqId`, `reqNumber`, `oneOf`, `optUrl`, `reqTimezone`, …). Never trust a raw payload field.

### Database is the source of truth for business logic

Business rules live in Postgres functions, not TypeScript:

| Function | Migration | Role |
| --- | --- | --- |
| `create_order` | `…0002_rpc.sql`, redefined in `…0006_…` then `…0007_propina.sql` | Checkout: pricing, tip, stock, points, folio |
| `cancel_order` | `…0003_cancel_order.sql` | Reverses stock and points; only before that day's cash close |
| `delete_order` | `…0008_delete_order.sql` | Reverses effects then **deletes** the sale; admin-only, for clearing test data |
| `delete_order_item` | `…0009_delete_order_item.sql` | Removes one line, returns its ingredients, recomputes the ticket |
| `close_cash` | `…0002_rpc.sql`, redefined in `…0007_propina.sql` | Cash close, now also totalling tips |
| `adjust_stock`, `adjust_points`, `business_day` | `…0002_rpc.sql` | Manual stock/point moves, operating-day calc |

`…0004_harden_function_grants.sql` revokes `EXECUTE` from `PUBLIC` on these.

**When editing a function, add a new migration that `create or replace`s it — `…0007` holds the current `create_order` and `close_cash`.** Migrations are the only schema source of truth and are applied via the Supabase SQL Editor in filename order (or `supabase db push`).

Tip (`orders.tip`) is the one amount that originates on the client. It is validated twice — `reqNumber(min: 0)` in the action, and capped at the discounted consumption inside `create_order`. It is stored in its own column, never dissolved into `total`, so the cash close can separate sale from tip. Discount applies to consumption only, never to the tip.

### Categories are data, not an enum

`…0010_categorias.sql` replaced the `category_id` enum with a `categories` table
(`id` is a text slug, `products.category` is an FK with `on update cascade` /
`on delete restrict`). Admins create, rename, reorder and delete them from
Productos, so **never hardcode a category list in TypeScript** — read
`AppState.categories` and use `categoryLabel` / `categoryEmoji` from
`lib/types.ts`. A category's slug is derived from its name once (`slugifyCategory`)
and never changes afterwards, because sold rows point at it. An *inactive*
category stops being offered (POS filter, product form) but its products keep
selling. `deleteCategory` refuses a non-empty category unless it is told which
category the products move to.

`lib/database.types.ts` is a hand-maintained mirror of the schema. **Changing a migration without updating it silently removes type safety.**

`num()` in `lib/supabase.ts` exists because Postgres returns `numeric` as a string — every monetary value must pass through it.

### Client state

`lib/store.tsx` (`StoreProvider`, `useStore`) holds the whole `AppState` client-side, but as a pure mirror: every mutation replaces it wholesale with the state the server just returned, and it polls every 15s while the tab is visible. There are no local optimistic copies — deliberate, because two registers may be selling simultaneously. Use `submit(action, options)` from the store rather than calling server actions directly from components; it handles busy state, state sync and toasts.

`app/(app)/layout.tsx` is the gate: config check → session → activation → `loadAppState` → `StoreProvider` + `AppShell`. It is `force-dynamic` (the POS must never serve cached data). Route pages under `app/(app)/` are one-line wrappers around a `components/modules/*` component.

### Deletion chain (clearing test data)

Test records must be removable in a fixed order, because each link holds the next: **sale → product → ingredient**. A sale's `inventory_movements` pin the ingredient; a product's recipe pins it too. So `delete_order` removes the sale and its movements, `deleteProduct` cascades the recipe away, and only then is the ingredient unreferenced and deletable.

`delete_order` reverses stock and points **before** deleting the row, and that order is mandatory: `inventory_movements.order_id` is `on delete set null`, so deleting first would erase the only record of how much to give back and silently corrupt stock. It skips the reversal for already-cancelled tickets, whose movements `cancel_order` already reversed — reversing twice would inflate stock. It refuses once that day's cash close exists.

`delete_order_item` (surfaced in `/pedidos`, `components/modules/order-admin.tsx`) removes a single line. It cannot subtract that line's `inventory_movements` — those are aggregated per ingredient per order, not per line — so it recomputes the line's consumption from the recipe exactly as `create_order` did, honouring `service_mode` for packaging and the milk stored in the line's modifiers. It then recomputes subtotal/total/points and refuses to empty a ticket (use `delete_order`). Tip is preserved, only capped if consumption drops below it. This is why `OrderItem` carries `id`.

`cancelOrder` and `deleteOrder` are not interchangeable: cancelling keeps the sale (it happened, and history must explain it) and is the right daily-operation tool; deleting destroys history and exists only for test cleanup. Both are `requireAdmin`.

### History survives deletion

`order_items` stores a snapshot of each line at sale time (name, emoji, price, image) and its `product_id` FK is `on delete set null`. That is what makes deleting a product safe at any time, sales or not — `deleteProduct` always deletes. `useDerived().topProducts` in `lib/store.tsx` therefore groups by live product when one exists and falls back to the line's stored name, flagging the entry `deleted: true` so reports show it as "fuera del menú" instead of silently dropping those sales. If you add a report that joins order lines back to `products`, apply the same fallback or the totals will stop matching.

### Loading windows

`loadAppState` in `lib/data.ts` intentionally bounds what it reads: `ORDER_WINDOW_DAYS = 9`, `CUSTOMER_LIMIT = 1000`, `CASH_CLOSE_LIMIT = 60`, `PREPARED_LIMIT = 200`. Full history lives in the DB and is queried separately. Keep new fields inside a bounded window rather than loading everything.

### Layered config

- `lib/env.ts` — no missing env var crashes the app at boot. Each service reports `{ ok, missing }` and the UI renders a notice naming exactly what's absent, so the app can be deployed in stages.
- **Feature flags** (`settings` table, toggled in Ajustes) change real behavior, not just UI: inventory off stops stock decrementing, loyalty off stops points accruing. Gate with `FlagGate` in `components/ui.tsx`.
- **`lib/feature-visibility.ts`** is a separate, purely cosmetic kill switch (`SHOW_LEALTAD_UI`) that hides UI without touching the DB or business flags. Don't conflate it with feature flags.
- **Timezone** comes from settings, never the browser — the operating day and cash close depend on it. Use `dayKey`/helpers from `lib/format.ts` with the store's `tz`.

### Files by role

- `lib/actions.ts` — daily operation: checkout, orders, stock, customers, points, cash close, prepared items.
- `lib/actions-admin.ts` — menu, settings, staff, media. Guards with `requireAdmin`.
- `lib/data.ts` — `loadAppState` plus row→domain translators.
- `lib/catalog.ts` — optional suggested starting catalog (the DB ships empty by design; stock starts at zero because real inventory is counted, not guessed).
- `lib/r2.ts` + `app/api/media/[...key]` — signed uploads; the API route serves R2 files when no public domain is configured.
- `components/ui.tsx` — the design system. Reuse `Button`, `Card`, `Modal`, `Field`, `AccessGate`, `FlagGate`, `ConfirmButton`, `MediaImage`, `ImageUpload` rather than adding new primitives.

## Scope boundaries

Card and Mercado Pago payments are **recorded, not processed** — no terminal or MP API integration. Google ratings are entered by hand (only the review QR is real). The app assumes a single branch; the schema would support more but the UI does not.

## Reference docs

`README.md` (architecture, modules, operational details) and `INSTRUCCIONES.md` (step-by-step service setup) are both current and detailed — read them before asking the user about setup.
