"use client";

import { useState } from "react";
import { useDerived, useStore } from "@/lib/store";
import { dayKey, money, weekday } from "@/lib/format";
import { PAYMENT_META, type PaymentMethod } from "@/lib/types";
import {
  AccessGate,
  Card,
  EmptyState,
  PageHeader,
  Stat,
  cx,
} from "@/components/ui";

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
  const { state, tz, currency } = useStore();
  const { topProducts, todayKey, week } = useDerived();
  const [range, setRange] = useState<RangeId>("7d");

  if (state.role === "empleado") return <AccessGate module="Reportes" />;

  const sales = state.orders.filter((o) => o.status !== "cancelado");
  const weekKeys = new Set(week.map((d) => d.key));

  const filtered =
    range === "hoy"
      ? sales.filter((o) => dayKey(o.createdAt, tz) === todayKey)
      : sales.filter((o) => weekKeys.has(dayKey(o.createdAt, tz)));
  const rangeText = range === "hoy" ? "hoy" : "últimos 7 días";

  const ingresos = filtered.reduce((sum, o) => sum + o.total, 0);
  const tickets = filtered.length;
  const ticketPromedio = tickets ? Math.round(ingresos / tickets) : 0;
  const piezas = filtered.reduce(
    (sum, o) => sum + o.items.reduce((n, it) => n + it.qty, 0),
    0,
  );

  const maxDay = Math.max(...week.map((d) => d.total), 1);

  const top = topProducts.slice(0, 8);
  const topMax = Math.max(top[0]?.qty ?? 1, 1);

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

  // Horas pico: franjas de 7:00 a 22:00 en la zona horaria del negocio.
  const hourSlots: { hour: number; count: number }[] = [];
  for (let h = 7; h <= 22; h++) hourSlots.push({ hour: h, count: 0 });
  const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: tz,
  });
  for (const o of filtered) {
    const h = Number(hourFormatter.format(new Date(o.createdAt)).slice(0, 2));
    const slot = hourSlots.find((s) => s.hour === h);
    if (slot) slot.count += 1;
  }
  const maxHourCount = Math.max(...hourSlots.map((s) => s.count));

  if (!sales.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Números del negocio"
          title="Reportes"
          desc="Ingresos, productos y métodos de pago, calculados con las ventas registradas."
        />
        <EmptyState
          emoji="📈"
          title="Aún no hay ventas para reportar"
          desc="En cuanto empieces a cobrar en el punto de venta, aquí verás ingresos, productos más vendidos, métodos de pago y horas pico."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Números del negocio"
        title="Reportes"
        desc="Ingresos, productos y métodos de pago, calculados al momento con las ventas registradas."
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
        <Stat
          label="Ingresos"
          value={money(ingresos, currency)}
          hint={rangeText}
          tone="matcha"
        />
        <Stat label="Tickets" value={tickets} hint="Pedidos cobrados" />
        <Stat
          label="Ticket promedio"
          value={money(ticketPromedio, currency)}
          hint="Por pedido"
        />
        <Stat label="Piezas" value={piezas} hint="Bebidas y bakery" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* ---------------------------- Ventas por día ---------------------------- */}
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">Ventas por día · últimos 7 días</p>
              <p className="text-[10px] font-bold text-muted">
                Zona horaria: {tz}
              </p>
            </div>
            <div
              className="mt-4 flex h-40 items-end gap-2"
              role="img"
              aria-label="Gráfica de barras con las ventas de cada uno de los últimos 7 días"
            >
              {week.map((d) => (
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
                      d.key === todayKey ? "bg-matcha-deep" : "bg-matcha-light",
                    )}
                    style={{ height: `${Math.max((d.total / maxDay) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] font-extrabold uppercase text-muted">
                    {weekday(`${d.key}T12:00:00`, tz)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ---------------------------- Top productos ----------------------------- */}
          <Card>
            <p className="eyebrow">Top productos · histórico cargado</p>
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
                        {entry.qty} uds · {money(entry.revenue, currency)}
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
                  Todavía no hay productos vendidos.
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
                    aria-label={`Distribución de ingresos por método de pago, total ${money(ingresos, currency)}`}
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
                    <p className="display text-lg text-ink">
                      {money(ingresos, currency)}
                    </p>
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
                        {money(s.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                Sin ventas en este rango. Cobra algo en el punto de venta y aquí
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
              aria-label={`Pedidos por hora entre las 7:00 y las 22:00, ${rangeText}`}
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
                  {(s.hour - 7) % 3 === 0 ? `${s.hour}` : ""}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <p className="eyebrow">Alcance de los reportes</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              El panel trabaja con las ventas de los últimos días para mantenerse
              rápido. Para el histórico completo, las ventas viven en la base de
              datos y se pueden consultar desde Supabase.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
