"use client";

import Link from "next/link";
import { useDerived, useStore } from "@/lib/store";
import { dayKey, money, time, weekday } from "@/lib/format";
import { STATUS_META } from "@/lib/types";
import { Icons } from "@/components/icons";
import { AccessGate, Badge, Card, cx, PageHeader, Stat } from "@/components/ui";

export function DashboardModule() {
  const { state } = useStore();
  const {
    todayOrders,
    todaySales,
    todayUnits,
    activeOrders,
    lowStock,
    topProducts,
    cashClosedToday,
  } = useDerived();

  if (state.role === "empleado") return <AccessGate module="Inicio" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  // Ventas por día (últimos 7 días) para la mini gráfica
  const days: { key: string; label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d.toISOString());
    days.push({ key, label: weekday(d.toISOString()), total: 0 });
  }
  for (const o of state.orders) {
    const slot = days.find((d) => d.key === dayKey(o.createdAt));
    if (slot) slot.total += o.total;
  }
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  const avgTicket = todayOrders.length ? Math.round(todaySales / todayOrders.length) : 0;
  const rating =
    state.reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(state.reviews.length, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mise en place · resumen del día"
        title={`${greeting}, la barra está lista`}
        desc="Todo lo que ves sale de los datos de ejemplo: cobra en el punto de venta y mira cómo se mueven estas métricas."
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Venta de hoy"
          value={money(todaySales)}
          hint={cashClosedToday ? "Caja cerrada" : "Turno abierto"}
          tone="matcha"
        />
        <Stat label="Tickets" value={todayOrders.length} hint={`Ticket promedio ${money(avgTicket)}`} />
        <Stat label="Piezas vendidas" value={todayUnits} hint="Bebidas y bakery" />
        <Stat
          label="Alertas de insumos"
          value={lowStock.length}
          hint={lowStock.length ? "Revisar inventario" : "Todo abastecido"}
          tone={lowStock.length ? "amber" : "neutral"}
        />
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
                    {time(order.createdAt)}
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
                Cobra algo en el punto de venta y la comanda aparecerá aquí.
              </p>
            ) : null}
          </div>

          {/* ------------------------- Ventas de la semana ------------------------- */}
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Ventas · últimos 7 días</p>
              <Link href="/reportes" className="focus-ring text-xs font-extrabold text-matcha-deep hover:underline">
                Ver reportes
              </Link>
            </div>
            <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label="Gráfica de ventas de los últimos 7 días">
              {days.map((d, i) => (
                <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[10px] font-bold text-muted">{money(d.total)}</span>
                  <div
                    className={cx(
                      "w-full rounded-t-lg transition-all",
                      i === days.length - 1 ? "bg-matcha-deep" : "bg-matcha-light",
                    )}
                    style={{ height: `${Math.max((d.total / maxDay) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] font-extrabold uppercase text-muted">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {/* ---------------------------- Top productos ---------------------------- */}
          <Card>
            <p className="eyebrow">Más vendidos · semana</p>
            <div className="mt-4 space-y-3">
              {topProducts.slice(0, 5).map((entry, i) => (
                <div key={entry.product!.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-extrabold text-muted">{i + 1}</span>
                  <span className="text-lg" aria-hidden>
                    {entry.product!.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-bold text-ink">{entry.product!.name}</p>
                      <p className="shrink-0 text-xs font-extrabold text-muted">{entry.qty} uds</p>
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
          </Card>

          {/* -------------------------- Alertas de insumos -------------------------- */}
          {state.flags.inventario ? (
            <Card className={cx(lowStock.length && "border-amber/40")}>
              <div className="flex items-center justify-between">
                <p className="eyebrow">Insumos por resurtir</p>
                <Link href="/inventario" className="focus-ring text-xs font-extrabold text-matcha-deep hover:underline">
                  Inventario
                </Link>
              </div>
              {lowStock.length ? (
                <ul className="mt-3 space-y-2">
                  {lowStock.slice(0, 4).map((ing) => (
                    <li key={ing.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-ink">{ing.name}</span>
                      <Badge tone="amber">
                        {ing.stock} / {ing.min} {ing.unit}
                      </Badge>
                    </li>
                  ))}
                  {lowStock.length > 4 ? (
                    <li className="text-xs text-muted">y {lowStock.length - 4} más…</li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">Nada por resurtir: la barra está abastecida.</p>
              )}
            </Card>
          ) : null}

          {/* ---------------------------- Reseñas Google ---------------------------- */}
          {state.flags.resenasGoogle ? (
            <Card className="bg-ink text-paper">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-matcha-light">
                  Reseñas de Google · demo
                </p>
                <span className="flex items-center gap-1 text-sm font-extrabold">
                  <Icons.star className="h-4 w-4 text-matcha-light" />
                  {rating.toFixed(1)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-paper/80">
                “{state.reviews[0]?.text}”
              </p>
              <p className="mt-2 text-xs text-paper/50">
                {state.reviews[0]?.author} · {state.reviews[0]?.date}
              </p>
              <Link
                href="/clientes"
                className="focus-ring mt-4 inline-block rounded-full border border-paper/25 px-4 py-2 text-xs font-extrabold text-paper hover:border-matcha-light"
              >
                Ver todas las reseñas
              </Link>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
