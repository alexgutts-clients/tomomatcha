"use client";

import { useState } from "react";
import { closeCash, reopenCash } from "@/lib/actions";
import { useDerived, useStore } from "@/lib/store";
import { money, shortDate, time, weekday } from "@/lib/format";
import { PAYMENT_META, type PaymentMethod } from "@/lib/types";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  PageHeader,
  Stat,
  cx,
} from "@/components/ui";

export function CashCloseModule() {
  const { state, tz, currency, submit, busy } = useStore();
  const { todayOrders, todaySales, cashClosedToday, todayClose } = useDerived();

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

  const breakdown = mpOn
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
          label: "Tarjeta y otros",
          short: "Tarjeta y otros",
          total: byMethod.tarjeta.total + byMethod.mercadopago.total,
          count: byMethod.tarjeta.count + byMethod.mercadopago.count,
          barClass: "bg-ink",
        },
      ];

  const parsed = counted.trim() === "" ? null : Number(counted);
  const valid = parsed !== null && Number.isFinite(parsed) && parsed >= 0;
  const difference = valid
    ? Math.round((parsed - expectedCash) * 100) / 100
    : 0;

  const diffLabel = (value: number): string => {
    if (value === 0) return "Exacto ✓";
    return value > 0
      ? `+${money(value, currency)}`
      : `−${money(Math.abs(value), currency)}`;
  };

  const handleConfirm = async () => {
    if (!valid || parsed === null) return;
    const saved = await submit(
      () => closeCash(parsed, notes.trim() || undefined),
      {
        title: "Corte registrado",
        detail:
          difference === 0
            ? "La caja cuadró exacta."
            : difference > 0
              ? `Sobraron ${money(difference, currency)} en el cajón.`
              : `Faltaron ${money(Math.abs(difference), currency)} en el cajón.`,
      },
    );
    if (saved !== null) {
      setCounted("");
      setNotes("");
    }
  };

  const history = [...state.cashCloses]
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cierre del día · conciliación"
        title="Corte de caja"
        desc="Al cerrar el turno se separa lo cobrado en efectivo de tarjeta y pagos digitales, y se concilia contra lo contado en el cajón. Mientras el corte esté cerrado, el punto de venta no cobra."
      />

      <div
        className={cx(
          "grid grid-cols-2 gap-3",
          mpOn ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <Stat
          label="Venta total de hoy"
          value={money(totalDay, currency)}
          hint={`${todayOrders.length} ticket${todayOrders.length === 1 ? "" : "s"} del día`}
          tone="matcha"
        />
        <Stat
          label="Efectivo esperado"
          value={money(expectedCash, currency)}
          hint={`${byMethod.efectivo.count} ticket${byMethod.efectivo.count === 1 ? "" : "s"} en efectivo`}
        />
        {mpOn ? (
          <>
            <Stat
              label="Tarjeta"
              value={money(byMethod.tarjeta.total, currency)}
              hint={`${byMethod.tarjeta.count} ticket${byMethod.tarjeta.count === 1 ? "" : "s"}`}
            />
            <Stat
              label="Mercado Pago"
              value={money(byMethod.mercadopago.total, currency)}
              hint={`${byMethod.mercadopago.count} ticket${byMethod.mercadopago.count === 1 ? "" : "s"}`}
            />
          </>
        ) : (
          <Stat
            label="Tarjeta y otros"
            value={money(
              byMethod.tarjeta.total + byMethod.mercadopago.total,
              currency,
            )}
            hint="Pagos no en efectivo"
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
                Cerró {todayClose.closedBy} a las {time(todayClose.closedAt, tz)}
              </p>

              <dl className="mt-4 divide-y divide-line">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Efectivo esperado</dt>
                  <dd className="display text-lg text-ink">
                    {money(todayClose.expectedCash, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Efectivo contado</dt>
                  <dd className="display text-lg text-ink">
                    {money(todayClose.countedCash, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-bold text-ink">Tarjeta y otros</dt>
                  <dd className="display text-lg text-ink">
                    {money(todayClose.expectedCard, currency)}
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
                <ConfirmButton
                  label="Reabrir turno"
                  confirmLabel="Sí, reabrir"
                  question="Se borra el corte de hoy."
                  variant="ghost"
                  size="md"
                  disabled={busy}
                  onConfirm={() =>
                    void submit(() => reopenCash(), {
                      title: "Turno reabierto",
                      detail: "El punto de venta puede volver a cobrar.",
                    })
                  }
                />
                <p className="mt-2 text-xs leading-5 text-muted">
                  Al reabrir se elimina el registro del corte y el punto de venta
                  vuelve a cobrar. Cuando termines, hay que cerrar de nuevo.
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
                  <dd className="display text-lg text-ink">
                    {money(expectedCash, currency)}
                  </dd>
                </div>
                {state.settings.cashFloat > 0 ? (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-sm font-bold text-ink">Fondo de caja</dt>
                    <dd className="text-xs text-muted">
                      {money(state.settings.cashFloat, currency)} se quedan como
                      fondo
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4">
                <Field label="Efectivo contado">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={counted}
                    onChange={(e) => setCounted(e.target.value)}
                    aria-label="Efectivo contado"
                    placeholder="0"
                    className="py-3 text-lg"
                  />
                </Field>
              </div>

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
                    Sobran {money(difference, currency)}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-amber">
                    Faltan {money(Math.abs(difference), currency)}
                  </p>
                )}
              </div>

              <Input
                type="text"
                value={notes}
                maxLength={400}
                onChange={(e) => setNotes(e.target.value)}
                aria-label="Notas del corte (opcional)"
                placeholder="Notas del corte (opcional)"
                className="mt-3"
              />

              <Button
                variant="matcha"
                size="lg"
                className="mt-4 w-full"
                disabled={!valid || busy}
                onClick={() => void handleConfirm()}
              >
                {busy ? "Guardando…" : "Confirmar corte del día"}
              </Button>
              <p className="mt-2.5 text-xs leading-5 text-muted">
                Al cerrar el corte se pausa el cobro en el punto de venta hasta
                reabrir el turno.
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
                    <p className="truncate text-sm font-bold text-ink">
                      {seg.label}
                    </p>
                    <p className="text-xs text-muted">
                      {seg.count} ticket{seg.count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="display shrink-0 text-lg text-ink">
                  {money(seg.total, currency)}
                </p>
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
              <p className="mt-3 text-xs leading-5 text-muted">
                Sólo el efectivo se concilia contra el cajón; el resto se cruza con
                los estados de cuenta de la terminal.
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
                      {weekday(close.closedAt, tz)} ·{" "}
                      {shortDate(close.closedAt, tz)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {close.orders} ticket{close.orders === 1 ? "" : "s"} · cerró{" "}
                      {close.closedBy}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs text-muted">
                      Esperado{" "}
                      <span className="font-extrabold text-ink">
                        {money(close.expectedCash, currency)}
                      </span>{" "}
                      · Contado{" "}
                      <span className="font-extrabold text-ink">
                        {money(close.countedCash, currency)}
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
            Aún no hay cortes anteriores; el primero aparecerá aquí cuando cierres
            el día.
          </p>
        )}
      </div>
    </div>
  );
}
