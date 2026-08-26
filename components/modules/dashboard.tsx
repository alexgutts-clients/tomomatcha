"use client";

import Link from "next/link";
import { useDerived, useStore } from "@/lib/store";
import { money, shortDate, time, weekday } from "@/lib/format";
import { STATUS_META, daysUntil, expiryLevel } from "@/lib/types";
import { SHOW_LEALTAD_UI } from "@/lib/feature-visibility";
import { Icons } from "@/components/icons";
import { InstructionsPanel } from "@/components/instructions";
import {
  AccessGate,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Stat,
  cx,
} from "@/components/ui";

export function DashboardModule() {
  const { state, tz, currency } = useStore();
  const {
    todayOrders,
    todaySales,
    todayUnits,
    activeOrders,
    lowStock,
    topProducts,
    cashClosedToday,
    week,
  } = useDerived();

  // El manual va antes del candado: un empleado nuevo entra a Inicio y lo
  // primero que necesita no es el resumen del día, es saber cómo se usa esto.
  if (state.role === "empleado") {
    return (
      <div className="space-y-6">
        <InstructionsPanel />
        <AccessGate module="Inicio" />
      </div>
    );
  }

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz })
      .format(new Date(state.loadedAt))
      .slice(0, 2),
  );
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const maxDay = Math.max(...week.map((d) => d.total), 1);
  const avgTicket = todayOrders.length
    ? Math.round(todaySales / todayOrders.length)
    : 0;

  const catalogEmpty = state.products.length === 0;

  // Lotes de cocina que caducan hoy o mañana y nadie ha revisado.
  const expiring = state.preparedItems
    .map((item) => ({ item, days: daysUntil(item.expiresOn, state.todayKey) }))
    .filter(({ days }) => expiryLevel(days) === "critico" || days < 0)
    .sort((a, b) => a.days - b.days);
  const unattended = expiring.filter(({ item }) => !item.acknowledgedAt);

  return (
    <div className="space-y-6">
      <InstructionsPanel />

      <PageHeader
        eyebrow={`${state.settings.branchName} · resumen del día`}
        title={`${greeting}, ${state.me.fullName.split(" ")[0]}`}
        desc="Lo que va del turno: venta, comandas en barra e insumos que hay que resurtir."
        actions={
          <Link
            href="/pos"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-matcha-deep px-5 py-2.5 text-sm font-bold text-paper shadow-pop transition hover:bg-matcha"
          >
            <Icons.pos className="h-4 w-4" />
            Abrir punto de venta
          </Link>
        }
      />

      {catalogEmpty ? (
        <Card className="border-matcha/40 bg-matcha-mist">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-ink">
                Todavía no hay productos en la carta
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Crea tu menú en Productos, o carga el catálogo sugerido de
                TomoMatcha desde Ajustes y ajústalo a tu gusto.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/productos"
                className="focus-ring rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-paper hover:bg-ink-soft"
              >
                Crear productos
              </Link>
              <Link
                href="/ajustes"
                className="focus-ring rounded-full border border-line bg-white px-4 py-2 text-xs font-extrabold text-ink hover:border-matcha"
              >
                Cargar catálogo
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Venta de hoy"
          value={money(todaySales, currency)}
          hint={cashClosedToday ? "Caja cerrada" : "Turno abierto"}
          tone="matcha"
        />
        <Stat
          label="Tickets"
          value={todayOrders.length}
          hint={`Ticket promedio ${money(avgTicket, currency)}`}
        />
        <Stat label="Piezas vendidas" value={todayUnits} hint="Bebidas y bakery" />
        {state.flags.inventario ? (
          <Stat
            label="Alertas de insumos"
            value={lowStock.length}
            hint={lowStock.length ? "Revisar inventario" : "Todo abastecido"}
            tone={lowStock.length ? "amber" : "neutral"}
          />
        ) : SHOW_LEALTAD_UI ? (
          <Stat
            label="Clientes registrados"
            value={state.customers.length}
            hint="Programa de lealtad"
          />
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* --------------------------- Comandas activas --------------------------- */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">En barra ahora</p>
              <h2 className="display mt-1 text-xl text-ink">
                {activeOrders.length
                  ? `${activeOrders.length} comanda${activeOrders.length === 1 ? "" : "s"} en curso`
                  : "Sin comandas pendientes"}
              </h2>
            </div>
            <Link
              href="/comandas"
              className="focus-ring rounded-full border border-line px-4 py-2 text-xs font-extrabold text-ink transition hover:border-matcha hover:text-matcha-deep"
            >
              Ver tablero
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {activeOrders.slice(0, 4).map((order) => (
              <Link
                key={order.id}
                href="/comandas"
                className="focus-ring flex items-center gap-3 rounded-xl2 border border-line bg-paper px-4 py-3 transition hover:border-matcha"
              >
                <span className="text-xl" aria-hidden>
                  {order.items[0]?.emoji ?? "🍵"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-ink">
                    #{order.folio} ·{" "}
                    {order.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {time(order.createdAt, tz)}
                    {order.customerName ? ` · ${order.customerName}` : ""}
                  </span>
                </span>
                <Badge
                  tone={
                    order.status === "nuevo"
                      ? "amber"
                      : order.status === "preparando"
                        ? "matcha"
                        : "ink"
                  }
                >
                  {STATUS_META[order.status].label}
                </Badge>
              </Link>
            ))}
            {!activeOrders.length ? (
              <p className="rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                Cobra en el punto de venta y la comanda aparecerá aquí.
              </p>
            ) : null}
          </div>

          {/* ------------------------- Ventas de la semana ------------------------- */}
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Ventas · últimos 7 días</p>
              <Link
                href="/reportes"
                className="focus-ring text-xs font-extrabold text-matcha-deep hover:underline"
              >
                Ver reportes
              </Link>
            </div>
            <div
              className="mt-4 flex h-28 items-end gap-2"
              role="img"
              aria-label="Gráfica de ventas de los últimos 7 días"
            >
              {week.map((d, i) => (
                <div
                  key={d.key}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-[10px] font-bold text-muted">
                    {money(d.total, currency)}
                  </span>
                  <div
                    className={cx(
                      "w-full rounded-t-lg transition-all",
                      i === week.length - 1 ? "bg-matcha-deep" : "bg-matcha-light",
                    )}
                    style={{ height: `${Math.max((d.total / maxDay) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] font-extrabold uppercase text-muted">
                    {weekday(`${d.key}T12:00:00`, tz)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {/* ---------------------------- Top productos ---------------------------- */}
          <Card>
            <p className="eyebrow">Más vendidos</p>
            {topProducts.length ? (
              <div className="mt-4 space-y-3">
                {topProducts.slice(0, 5).map((entry, i) => (
                  <div key={entry.product.id} className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm font-extrabold text-muted">
                      {i + 1}
                    </span>
                    <span className="text-lg" aria-hidden>
                      {entry.product.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-bold text-ink">
                          {entry.product.name}
                          {entry.deleted ? (
                            <span className="ml-1.5 text-[10px] font-bold text-muted">
                              (fuera del menú)
                            </span>
                          ) : null}
                        </p>
                        <p className="shrink-0 text-xs font-extrabold text-muted">
                          {entry.qty} uds
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
                        <div
                          className="h-full rounded-full bg-matcha"
                          style={{
                            width: `${(entry.qty / Math.max(topProducts[0]?.qty ?? 1, 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted">
                Cuando empiecen a entrar ventas, aquí verás qué se vende más.
              </p>
            )}
          </Card>

          {/* -------------------------- Alertas de insumos -------------------------- */}
          {state.flags.inventario ? (
            <Card className={cx(lowStock.length > 0 && "border-amber/40")}>
              <div className="flex items-center justify-between">
                <p className="eyebrow">Insumos por resurtir</p>
                <Link
                  href="/inventario"
                  className="focus-ring text-xs font-extrabold text-matcha-deep hover:underline"
                >
                  Inventario
                </Link>
              </div>
              {lowStock.length ? (
                <ul className="mt-3 space-y-2">
                  {lowStock.slice(0, 5).map((ing) => (
                    <li
                      key={ing.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate font-bold text-ink">
                        {ing.name}
                      </span>
                      <Badge tone="amber">
                        {Math.round(ing.stock)} / {Math.round(ing.min)} {ing.unit}
                      </Badge>
                    </li>
                  ))}
                  {lowStock.length > 5 ? (
                    <li className="text-xs text-muted">
                      y {lowStock.length - 5} más…
                    </li>
                  ) : null}
                </ul>
              ) : state.ingredients.length ? (
                <p className="mt-3 text-sm text-muted">
                  Nada por resurtir: la barra está abastecida.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted">
                  Todavía no hay insumos registrados. Captúralos en Inventario
                  para que cada venta descuente solo.
                </p>
              )}
            </Card>
          ) : null}

          {/* ---------------------------- Caducidades ---------------------------- */}
          {expiring.length ? (
            <Card className={cx(unattended.length > 0 && "border-danger/40")}>
              <div className="flex items-center justify-between">
                <p className="eyebrow">Preparados por vencer</p>
                <Link
                  href="/preparados"
                  className="focus-ring text-xs font-extrabold text-matcha-deep hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {expiring.slice(0, 4).map(({ item, days }) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-bold text-ink">
                      {item.name}
                    </span>
                    <Badge tone="danger">
                      {days < 0
                        ? "Caducado"
                        : days === 0
                          ? "Hoy"
                          : "Mañana"}
                    </Badge>
                  </li>
                ))}
              </ul>
              {unattended.length ? (
                <p className="mt-3 text-xs font-bold leading-5 text-danger">
                  {unattended.length} sin revisar. El aviso sigue hasta que los
                  atiendas.
                </p>
              ) : null}
            </Card>
          ) : null}

          {/* --------------------------- Reseñas de Google --------------------------- */}
          {state.flags.resenasGoogle ? (
            <Card className="bg-ink text-paper">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-matcha-light">
                  Reseñas de Google
                </p>
                {state.settings.googleRating !== null ? (
                  <span className="flex items-center gap-1 text-sm font-extrabold">
                    <Icons.star className="h-4 w-4 text-matcha-light" />
                    {state.settings.googleRating.toFixed(1)}
                  </span>
                ) : null}
              </div>
              {state.settings.googleReviewUrl ? (
                <>
                  <p className="mt-3 text-sm leading-6 text-paper/80">
                    {state.settings.googleReviewsCount
                      ? `${state.settings.googleReviewsCount.toLocaleString("es-MX")} reseñas registradas.`
                      : "Pide reseñas en barra con el enlace de tu negocio."}
                  </p>
                  {SHOW_LEALTAD_UI ? (
                    <Link
                      href="/clientes"
                      className="focus-ring mt-4 inline-block rounded-full border border-paper/25 px-4 py-2 text-xs font-extrabold text-paper hover:border-matcha-light"
                    >
                      Ver el QR de reseñas
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-paper/70">
                  Pega el enlace de reseñas de tu negocio en Ajustes y se generará
                  el QR para imprimir en barra.
                </p>
              )}
            </Card>
          ) : null}
        </div>
      </div>

      {state.cashCloses.length ? (
        <Card>
          <p className="eyebrow">Últimos cortes</p>
          <ul className="mt-3 divide-y divide-line">
            {state.cashCloses.slice(0, 3).map((close) => (
              <li
                key={close.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="font-bold capitalize text-ink">
                  {weekday(close.closedAt, tz)} · {shortDate(close.closedAt, tz)}
                </span>
                <span className="text-xs text-muted">
                  {close.orders} ticket{close.orders === 1 ? "" : "s"} ·{" "}
                  <span className="font-extrabold text-ink">
                    {money(close.expectedCash + close.expectedCard, currency)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          emoji="📋"
          title="Aún no hay cortes registrados"
          desc="Al terminar el turno, registra el corte de caja para conciliar el efectivo del cajón."
        />
      )}
    </div>
  );
}
