"use client";

import { useState } from "react";
import { useDerived, useStore } from "@/lib/store";
import { money, shortDate, time, todayKey, weekday } from "@/lib/format";
import { PAYMENT_META, PaymentMethod } from "@/lib/types";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  cx,
  DemoTag,
  PageHeader,
  Stat,
} from "@/components/ui";

function diffLabel(difference: number): string {
  if (difference === 0) return "Exacto ✓";
  return difference > 0
    ? `+${money(difference)}`
    : `−${money(Math.abs(difference))}`;
}

export function CashCloseModule() {
  const { state, closeCash, reopenCash, notify } = useStore();
  const { todayOrders, todaySales, cashClosedToday } = useDerived();

  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");

  if (state.role === "empleado") return <AccessGate module="Corte de caja" />;

  const mpOn = state.flags.mercadoPago;

  const byMethod: Record<PaymentMethod, { total: number; count: number }> = {
    efectivo: { total: 0, count: 0 },
    tarjeta: { total: 0, count: 0 },
    mercadopago: { total: 0, count: 0 },
  };
  for (const o of todayOrders) {
    byMethod[o.payment].total += o.total;
    byMethod[o.payment].count += 1;
  }
  const expectedCash = byMethod.efectivo.total;
  const totalDay = todaySales;

  const breakdown: {
    id: string;
    label: string;
    short: string;
    total: number;
    count: number;
    barClass: string;
  }[] = mpOn
    ? [
        {
          id: "efectivo",
          label: PAYMENT_META.efectivo.label,
          short: PAYMENT_META.efectivo.short,
          ...byMethod.efectivo,
          barClass: "bg-matcha-deep",
        },
        {
          id: "tarjeta",
          label: PAYMENT_META.tarjeta.label,
          short: PAYMENT_META.tarjeta.short,
          ...byMethod.tarjeta,
          barClass: "bg-ink",
        },
        {
          id: "mercadopago",
          label: PAYMENT_META.mercadopago.label,
          short: PAYMENT_META.mercadopago.short,
          ...byMethod.mercadopago,
          barClass: "bg-amber",
        },
      ]
    : [
        {
          id: "efectivo",
          label: PAYMENT_META.efectivo.label,
          short: PAYMENT_META.efectivo.short,
          ...byMethod.efectivo,
          barClass: "bg-matcha-deep",
        },
        {
          id: "tarjeta-otros",
          label: "Tarjeta y otros (demo)",
          short: "Tarjeta y otros",
          total: byMethod.tarjeta.total + byMethod.mercadopago.total,
          count: byMethod.tarjeta.count + byMethod.mercadopago.count,
          barClass: "bg-ink",
        },
      ];

  const todayClose = state.cashCloses.find((c) => c.dateKey === todayKey());

  const parsed = counted.trim() === "" ? null : Number(counted);
  const valid = parsed !== null && Number.isFinite(parsed) && parsed >= 0;
  const difference = valid
    ? Math.round((parsed - expectedCash) * 100) / 100
    : 0;

  const handleConfirm = () => {
    if (!valid || parsed === null) return;
    closeCash(parsed, notes.trim() || undefined);
    notify(
      "Corte registrado (demo)",
      difference === 0
        ? "La caja cuadró exacta. ¡Buen cierre!"
        : difference > 0
          ? `Sobraron ${money(difference)} en el cajón.`
          : `Faltaron ${money(Math.abs(difference))} en el cajón.`,
    );
    setCounted("");
    setNotes("");
  };

  const history = [...state.cashCloses]
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cierre del día · conciliación"
        title="Corte de caja"
        desc="Al cerrar el turno se separa lo cobrado en efectivo de tarjeta y pagos digitales, y se concilia contra lo contado en el cajón. Todo es local y de demostración."
        actions={<DemoTag />}
      />

      <div
        className={cx(
          "grid grid-cols-2 gap-3",
          mpOn ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <Stat
          label="Venta total de hoy"
          value={money(totalDay)}
          hint={`${todayOrders.length} ticket${todayOrders.length === 1 ? "" : "s"} del día`}
          tone="matcha"
        />
        <Stat
          label="Efectivo esperado"
          value={money(expectedCash)}
          hint={`${byMethod.efectivo.count} ticket${byMethod.efectivo.count === 1 ? "" : "s"} en efectivo`}
        />
        {mpOn ? (
          <>
            <Stat
              label="Tarjeta (demo)"
              value={money(byMethod.tarjeta.total)}
              hint={`${byMethod.tarjeta.count} ticket${byMethod.tarjeta.count === 1 ? "" : "s"} · terminal simulada`}
            />
            <Stat
              label="Mercado Pago (simulado)"
              value={money(byMethod.mercadopago.total)}
              hint={`${byMethod.mercadopago.count} ticket${byMethod.mercadopago.count === 1 ? "" : "s"} · QR de demo`}
            />
          </>
        ) : (
          <Stat
            label="Tarjeta y otros"
            value={money(byMethod.tarjeta.total + byMethod.mercadopago.total)}
            hint="Pagos no en efectivo (demo)"
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* ----------------------------- Cierre de hoy ----------------------------- */}
        <Card>
          <p className="eyebrow">Cierre de hoy</p>

          {cashClosedToday && todayClose ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="display text-xl text-ink">La caja ya está cerrada</h2>
                <Badge tone="ink">Turno cerrado</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                Cerró {todayClose.closedBy} a las {time(todayClose.closedAt)}
              </p>

              <dl className="mt-4 divide-y divide-line">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Efectivo esperado</dt>
                  <dd className="display text-lg text-ink">
                    {money(todayClose.expectedCash)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Efectivo contado</dt>
                  <dd className="display text-lg text-ink">
                    {money(todayClose.countedCash)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Tarjeta y otros (demo)</dt>
                  <dd className="display text-lg text-ink">
                    {money(todayClose.expectedCard)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Diferencia</dt>
                  <dd>
                    <Badge tone={todayClose.difference === 0 ? "matcha" : "amber"}>
                      {diffLabel(todayClose.difference)}
                    </Badge>
                  </dd>
                </div>
              </dl>

              {todayClose.notes ? (
                <p className="mt-3 rounded-xl2 bg-cream px-4 py-3 text-xs italic leading-5 text-muted">
                  «{todayClose.notes}»
                </p>
              ) : null}

              <div className="mt-5 border-t border-line pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    reopenCash();
                    notify("Turno reabierto (demo)");
                  }}
                >
                  Reabrir turno (demo)
                </Button>
                <p className="mt-2 text-xs text-muted">
                  Al reabrir el turno se puede volver a cobrar en el punto de venta.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="display mt-2 text-xl text-ink">
                Concilia el efectivo del turno
              </h2>

              <dl className="mt-4 divide-y divide-line">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Efectivo esperado</dt>
                  <dd className="display text-lg text-ink">{money(expectedCash)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Fondo de caja</dt>
                  <dd className="text-xs text-muted">
                    {money(1000)} se quedan como fondo (informativo, demo)
                  </dd>
                </div>
              </dl>

              <label className="mt-4 block">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                  Efectivo contado
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  aria-label="Efectivo contado"
                  placeholder="0"
                  className="focus-ring mt-1.5 w-full rounded-xl2 border border-line bg-paper px-4 py-3 text-lg font-bold text-ink placeholder:text-muted/60"
                />
              </label>

              <div className="mt-3 min-h-[1.5rem]">
                {!valid ? (
                  <p className="text-sm text-muted">
                    Captura el efectivo contado para conciliar
                  </p>
                ) : difference === 0 ? (
                  <p className="text-sm font-bold text-matcha-deep">
                    Cuadra perfecto ✓
                  </p>
                ) : difference > 0 ? (
                  <p className="text-sm font-bold text-amber">
                    Sobran {money(difference)}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-amber">
                    Faltan {money(Math.abs(difference))}
                  </p>
                )}
              </div>

              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                aria-label="Notas del corte (opcional)"
                placeholder="Notas del corte (opcional)"
                className="focus-ring mt-3 w-full rounded-xl2 border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-muted/60"
              />

              <Button
                variant="matcha"
                size="lg"
                className="mt-4 w-full"
                disabled={!valid}
                onClick={handleConfirm}
              >
                Confirmar corte del día
              </Button>
              <p className="mt-2.5 text-xs text-muted">
                Al cerrar el corte se pausa el cobro en el punto de venta hasta
                reabrir el turno (demo).
              </p>
            </>
          )}
        </Card>

        {/* --------------------------- Desglose por método -------------------------- */}
        <Card>
          <p className="eyebrow">Desglose por método</p>
          <h2 className="display mt-2 text-xl text-ink">
            Cómo se cobró el día de hoy
          </h2>

          <div className="mt-4 space-y-3.5">
            {breakdown.map((seg) => (
              <div key={seg.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cx("h-2.5 w-2.5 shrink-0 rounded-full", seg.barClass)}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{seg.label}</p>
                    <p className="text-xs text-muted">
                      {seg.count} ticket{seg.count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="display shrink-0 text-lg text-ink">{money(seg.total)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div
              className="flex h-3 overflow-hidden rounded-full bg-cream"
              role="img"
              aria-label="Distribución de la venta de hoy por método de pago"
            >
              {totalDay > 0
                ? breakdown
                    .filter((seg) => seg.total > 0)
                    .map((seg) => (
                      <div
                        key={seg.id}
                        className={cx("h-full min-w-[6px]", seg.barClass)}
                        style={{ width: `${(seg.total / totalDay) * 100}%` }}
                      />
                    ))
                : null}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              {breakdown.map((seg) => (
                <span
                  key={seg.id}
                  className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted"
                >
                  <span
                    className={cx("h-2 w-2 rounded-full", seg.barClass)}
                    aria-hidden
                  />
                  {seg.short}
                </span>
              ))}
            </div>
            {totalDay === 0 ? (
              <p className="mt-3 text-xs text-muted">
                Aún no hay ventas hoy; cobra algo en el punto de venta para ver el
                desglose.
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted">
                Los pagos con tarjeta y digitales son simulados; solo el efectivo se
                concilia contra el cajón.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ------------------------------ Historial ------------------------------ */}
      <div>
        <h2 className="eyebrow">Cortes anteriores</h2>
        {history.length ? (
          <div className="mt-3 space-y-2.5">
            {history.map((close) => (
              <div key={close.id} className="card px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold capitalize text-ink">
                      {weekday(close.closedAt)} · {shortDate(close.closedAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {close.orders} ticket{close.orders === 1 ? "" : "s"} · cerró{" "}
                      {close.closedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted">
                      Esperado{" "}
                      <span className="font-extrabold text-ink">
                        {money(close.expectedCash)}
                      </span>{" "}
                      · Contado{" "}
                      <span className="font-extrabold text-ink">
                        {money(close.countedCash)}
                      </span>
                    </p>
                    <Badge tone={close.difference === 0 ? "matcha" : "amber"}>
                      {diffLabel(close.difference)}
                    </Badge>
                  </div>
                </div>
                {close.notes ? (
                  <p className="mt-2 text-xs italic text-muted">«{close.notes}»</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Aún no hay cortes anteriores; el primero aparecerá aquí cuando cierres el
            día.
          </p>
        )}
      </div>
    </div>
  );
}
