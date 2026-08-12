"use client";

import { useState } from "react";
import { useDerived, useStore } from "@/lib/store";
import { dayKey, money, todayKey, weekday } from "@/lib/format";
import { PAYMENT_META, PaymentMethod } from "@/lib/types";
import { AccessGate, Card, cx, DemoTag, PageHeader, Stat } from "@/components/ui";

type RangeId = "hoy" | "7d";

const RANGES: { id: RangeId; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "7 días" },
];

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  efectivo: "#4c5a32",
  tarjeta: "#191a14",
  mercadopago: "#a8741d",
};

const PAYMENT_ORDER: PaymentMethod[] = ["efectivo", "tarjeta", "mercadopago"];

export function ReportsModule() {
  const { state } = useStore();
  const { topProducts } = useDerived();
  const [range, setRange] = useState<RangeId>("7d");

  if (state.role === "empleado") return <AccessGate module="Reportes" />;

  const tKey = todayKey();
  // Ventana de 7 días: la misma que grafica "Ventas por día", para que los
  // totales de arriba siempre cuadren con las barras de abajo.
  const weekKeys = new Set<string>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekKeys.add(dayKey(d.toISOString()));
  }
  const filtered =
    range === "hoy"
      ? state.orders.filter((o) => dayKey(o.createdAt) === tKey)
      : state.orders.filter((o) => weekKeys.has(dayKey(o.createdAt)));
  const rangeText = range === "hoy" ? "hoy" : "últimos 7 días";

  const ingresos = filtered.reduce((sum, o) => sum + o.total, 0);
  const tickets = filtered.length;
  const ticketPromedio = tickets ? Math.round(ingresos / tickets) : 0;
  const piezas = filtered.reduce(
    (sum, o) => sum + o.items.reduce((n, it) => n + it.qty, 0),
    0,
  );

  // Ventas por día: la gráfica siempre muestra la última semana completa
  const days: { key: string; label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString();
    days.push({ key: dayKey(iso), label: weekday(iso), total: 0 });
  }

  for (const o of state.orders) {
    const slot = days.find((d) => d.key === dayKey(o.createdAt));
    if (slot) slot.total += o.total;
  }
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  // Top productos (histórico de la demo, vía selector derivado)
  const top = topProducts
    .slice(0, 8)
    .flatMap((e) =>
      e.product ? [{ product: e.product, qty: e.qty, revenue: e.revenue }] : [],
    );
  const topMax = Math.max(top[0]?.qty ?? 1, 1);

  // Métodos de pago del rango filtrado
  const byPayment = PAYMENT_ORDER.map((method) => {
    const amount = filtered
      .filter((o) => o.payment === method)
      .reduce((sum, o) => sum + o.total, 0);
    return {
      method,
      amount,
      pct: ingresos > 0 ? (amount / ingresos) * 100 : 0,
    };
  });
  let donutAcc = 0;
  const donutSegments = byPayment
    .filter((s) => s.pct > 0)
    .map((s) => {
      const offset = 25 - donutAcc;
      donutAcc += s.pct;
      return { ...s, offset };
    });

  // Horas pico: 11 franjas de 8:00 a 18:00
  const hourSlots: { hour: number; count: number }[] = [];
  for (let h = 8; h <= 18; h++) hourSlots.push({ hour: h, count: 0 });
  for (const o of filtered) {
    const h = new Date(o.createdAt).getHours();
    const slot = hourSlots.find((s) => s.hour === h);
    if (slot) slot.count += 1;
  }
  const maxHourCount = Math.max(...hourSlots.map((s) => s.count));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Números claros · datos de ejemplo"
        title="Reportes"
        desc="Ingresos, productos y métodos de pago calculados al momento con las ventas de la demo."
        actions={
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                className={cx(
                  "focus-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition",
                  range === r.id
                    ? "bg-ink text-paper"
                    : "border border-line bg-white text-ink hover:border-matcha hover:text-matcha-deep",
                )}
              >
                {range === r.id ? <span aria-hidden>✓</span> : null}
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={money(ingresos)} hint={rangeText} tone="matcha" />
        <Stat label="Tickets" value={tickets} hint="Pedidos cobrados" />
        <Stat label="Ticket promedio" value={money(ticketPromedio)} hint="Por pedido" />
        <Stat label="Piezas" value={piezas} hint="Bebidas y bakery" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* ---------------------------- Ventas por día ---------------------------- */}
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">Ventas por día · últimos 7 días</p>
              <p className="text-[10px] font-bold text-muted">
                La gráfica siempre muestra la última semana
              </p>
            </div>
            <div
              className="mt-4 flex h-40 items-end gap-2"
              role="img"
              aria-label="Gráfica de barras con las ventas de cada uno de los últimos 7 días"
            >
              {days.map((d) => (
                <div
                  key={d.key}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-[10px] font-bold text-muted">{money(d.total)}</span>
                  <div
                    className={cx(
                      "w-full rounded-t-lg transition-all",
                      d.key === tKey ? "bg-matcha-deep" : "bg-matcha-light",
                    )}
                    style={{ height: `${Math.max((d.total / maxDay) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] font-extrabold uppercase text-muted">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ---------------------------- Top productos ----------------------------- */}
          <Card>
            <p className="eyebrow">Top productos · histórico de la demo</p>
            <div className="mt-4 space-y-3">
              {top.map((entry, i) => (
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
                      </p>
                      <p className="shrink-0 text-xs font-extrabold text-muted">
                        {entry.qty} uds · {money(entry.revenue)}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
                      <div
                        className="h-full rounded-full bg-matcha"
                        style={{ width: `${(entry.qty / topMax) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {!top.length ? (
                <p className="rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                  Todavía no hay ventas registradas en la demo.
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {/* --------------------------- Métodos de pago ---------------------------- */}
          <Card>
            <p className="eyebrow">Métodos de pago · {rangeText}</p>
            {ingresos > 0 ? (
              <>
                <div className="relative mx-auto mt-4 w-40">
                  <svg
                    viewBox="0 0 42 42"
                    className="w-full"
                    role="img"
                    aria-label={`Distribución de ingresos por método de pago, total ${money(ingresos)}`}
                  >
                    <circle
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="none"
                      stroke="#f1ebda"
                      strokeWidth="6"
                    />
                    {donutSegments.map((s) => (
                      <circle
                        key={s.method}
                        cx="21"
                        cy="21"
                        r="15.9155"
                        fill="none"
                        stroke={PAYMENT_COLORS[s.method]}
                        strokeWidth="6"
                        strokeDasharray={`${s.pct} ${100 - s.pct}`}
                        strokeDashoffset={s.offset}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="display text-lg text-ink">{money(ingresos)}</p>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">
                      Total
                    </p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {byPayment.map((s) => (
                    <li key={s.method} className="flex items-center gap-2.5 text-sm">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PAYMENT_COLORS[s.method] }}
                      />
                      <span className="min-w-0 flex-1 truncate font-bold text-ink">
                        {PAYMENT_META[s.method].label}
                      </span>
                      <span className="shrink-0 text-xs font-extrabold text-muted">
                        {Math.round(s.pct)}%
                      </span>
                      <span className="w-20 shrink-0 text-right text-xs font-extrabold text-ink">
                        {money(s.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                Sin ventas en este rango todavía. Cobra algo en el punto de venta y aquí
                verás cómo pagaron.
              </p>
            )}
          </Card>

          {/* ------------------------------ Horas pico ------------------------------ */}
          <Card>
            <p className="eyebrow">Horas pico · {rangeText}</p>
            <div
              className="mt-4 flex h-20 items-end gap-1"
              role="img"
              aria-label={`Pedidos por hora entre las 8:00 y las 18:00, ${rangeText}`}
            >
              {hourSlots.map((s) => (
                <div
                  key={s.hour}
                  className={cx(
                    "flex-1 rounded-t",
                    maxHourCount > 0 && s.count === maxHourCount
                      ? "bg-matcha-deep"
                      : "bg-matcha-light",
                  )}
                  style={{
                    height: `${Math.max((s.count / Math.max(maxHourCount, 1)) * 100, 4)}%`,
                  }}
                />
              ))}
            </div>
            <div className="mt-1 flex gap-1">
              {hourSlots.map((s) => (
                <span
                  key={s.hour}
                  className="flex-1 text-center text-[9px] font-bold text-muted"
                >
                  {(s.hour - 8) % 2 === 0 ? `${s.hour}:00` : ""}
                </span>
              ))}
            </div>
          </Card>

          {/* --------------------------------- Nota --------------------------------- */}
          <Card className="flex items-start gap-3">
            <DemoTag />
            <p className="text-xs leading-5 text-muted">
              Los reportes se calculan al momento con las ventas de la demo. En
              producción se conectarían a la base de datos real.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
