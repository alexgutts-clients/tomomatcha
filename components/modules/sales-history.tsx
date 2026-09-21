"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { salesHistory } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { dayKey, dayKeyLabel, money, shiftDayKey, time } from "@/lib/format";
import {
  HISTORY_BUCKETS,
  HISTORY_EXPORT_MAX,
  HISTORY_PAGE_SIZE,
  PAYMENT_META,
  SERVICE_META,
  type HistoryBucket,
  type PaymentMethod,
  type SalesHistory,
  type SalesHistoryOrder,
  type SalesPeriod,
} from "@/lib/types";
import { Badge, Button, Card, Select, cx } from "@/components/ui";

/* ============================================================================
 * Histórico de ventas.
 *
 * El resto de Reportes mira los últimos días: es lo que el estado de la
 * aplicación carga, y así se mantiene ligero. Esta sección responde la otra
 * pregunta —«¿cómo va el mes?», «¿cuánto vendimos en marzo del año pasado?»—
 * consultando la base aparte, con `sales_history`.
 *
 * La suma no se hace aquí. Postgres agrupa por día, semana, mes o año en la
 * zona horaria del negocio y devuelve los periodos ya totalizados más una
 * página de tickets; al navegador nunca le llegan años de ventas para que los
 * sume él. Por eso cada cambio de filtro es una consulta nueva y no un filtro
 * sobre algo que ya estuviera en memoria.
 *
 * Los tickets anulados se cuentan siempre pero no suman dinero: una anulación
 * explica un hueco en los folios, y esconderla haría que el histórico mintiera.
 * ========================================================================== */

type PresetId = "7d" | "30d" | "mes" | "ano" | "todo" | "custom";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "mes", label: "Este mes" },
  { id: "ano", label: "Este año" },
  { id: "todo", label: "Todo" },
];

/** Agrupamiento que mejor se lee para cada rango, al elegirlo por primera vez. */
const PRESET_BUCKET: Record<Exclude<PresetId, "custom">, HistoryBucket> = {
  "7d": "dia",
  "30d": "dia",
  mes: "dia",
  ano: "mes",
  todo: "mes",
};

interface Range {
  from: string | null;
  to: string | null;
}

function presetRange(preset: Exclude<PresetId, "custom">, today: string): Range {
  switch (preset) {
    case "7d":
      return { from: shiftDayKey(today, -6), to: today };
    case "30d":
      return { from: shiftDayKey(today, -29), to: today };
    case "mes":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "ano":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "todo":
      return { from: null, to: null };
  }
}

function periodLabel(period: SalesPeriod, bucket: HistoryBucket): string {
  switch (bucket) {
    case "dia":
      return dayKeyLabel(period.key, {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    case "semana":
      return `${dayKeyLabel(period.key)} – ${dayKeyLabel(period.end)}`;
    case "mes":
      return dayKeyLabel(period.key, { month: "long", year: "numeric" });
    case "ano":
      return period.key.slice(0, 4);
  }
}

/** Al abrir un periodo se baja un nivel de detalle: el año enseña sus meses. */
const ZOOM: Record<HistoryBucket, HistoryBucket> = {
  ano: "mes",
  mes: "dia",
  semana: "dia",
  dia: "dia",
};

function rangeText(range: Range, history: SalesHistory | null): string {
  const from = range.from ?? history?.firstSaleDay ?? null;
  const to = range.to ?? history?.lastSaleDay ?? null;
  if (!from || !to) return "todo el histórico";
  if (from === to) return dayKeyLabel(from, { day: "numeric", month: "long" });
  return `${dayKeyLabel(from)} – ${dayKeyLabel(to, { day: "numeric", month: "short", year: "numeric" })}`;
}

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function ticketRows(orders: SalesHistoryOrder[], tz: string): string[][] {
  return orders.map((order) => [
    String(order.folio),
    dayKey(order.createdAt, tz),
    time(order.createdAt, tz),
    order.status,
    PAYMENT_META[order.payment].label,
    SERVICE_META[order.serviceMode].label,
    String(order.units),
    order.subtotal.toFixed(2),
    (order.subtotal - order.total + order.tip).toFixed(2),
    order.tip.toFixed(2),
    order.total.toFixed(2),
    order.customerName ?? "",
    order.createdByName ?? "",
    order.items.map((it) => `${it.qty}× ${it.name}`).join(" · "),
  ]);
}

const CSV_HEADERS = [
  "Folio",
  "Fecha",
  "Hora",
  "Estado",
  "Pago",
  "Servicio",
  "Piezas",
  "Subtotal",
  "Descuento",
  "Propina",
  "Total",
  "Cliente",
  "Cobró",
  "Productos",
];

/* -------------------------------- Un ticket ---------------------------------- */

function HistoryTicket({ order }: { order: SalesHistoryOrder }) {
  const { currency, tz } = useStore();
  const [open, setOpen] = useState(false);
  const cancelled = order.status === "cancelado";
  const discount = order.subtotal - order.total + order.tip;

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-lg px-1 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="text-sm font-extrabold text-ink">#{order.folio}</span>
          <span className="ml-2 text-xs text-muted">
            {dayKeyLabel(dayKey(order.createdAt, tz))} · {time(order.createdAt, tz)}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {order.units} pza · {PAYMENT_META[order.payment].short}
            {order.customerName ? ` · ${order.customerName}` : ""}
            {order.createdByName ? ` · ${order.createdByName}` : ""}
          </span>
        </span>
        <span className="flex items-center gap-2.5">
          {cancelled ? <Badge tone="amber">Anulado</Badge> : null}
          <span
            className={cx(
              "text-sm font-extrabold",
              cancelled ? "text-muted line-through" : "text-ink",
            )}
          >
            {money(order.total, currency)}
          </span>
          <span aria-hidden className="text-muted">
            {open ? "▴" : "▾"}
          </span>
        </span>
      </button>

      {open ? (
        <div className="pb-3 pl-1">
          <ul className="space-y-1.5">
            {order.items.map((item, i) => (
              <li
                key={`${order.id}:${i}`}
                className="flex items-center justify-between gap-3 rounded-xl2 bg-cream px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-ink">
                  <span aria-hidden className="mr-1.5">
                    {item.emoji}
                  </span>
                  <span className="font-bold">
                    {item.qty}× {item.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-extrabold text-muted">
                  {money(item.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Consumo {money(order.subtotal, currency)}
            {discount > 0.004
              ? ` · descuento ${money(discount, currency)}${
                  order.discountLabel ? ` (${order.discountLabel})` : ""
                }`
              : ""}
            {order.tip > 0 ? ` · propina ${money(order.tip, currency)}` : ""} ·{" "}
            {SERVICE_META[order.serviceMode].label}
          </p>
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------ Sección completa ------------------------------ */

export function SalesHistorySection() {
  const { state, tz, currency, notify } = useStore();

  const [preset, setPreset] = useState<PresetId>("30d");
  const [range, setRange] = useState<Range>(() =>
    presetRange("30d", state.todayKey),
  );
  const [bucket, setBucket] = useState<HistoryBucket>("dia");
  const [payment, setPayment] = useState<PaymentMethod | "">("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [page, setPage] = useState(0);

  const [history, setHistory] = useState<SalesHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Cada consulta lleva número: si el usuario cambia el filtro mientras una
  // respuesta viene en camino, la vieja se descarta en vez de pisar la nueva.
  const requestId = useRef(0);

  const { from, to } = range;

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);

    void salesHistory({
      from,
      to,
      bucket,
      payment: payment === "" ? null : payment,
      includeCancelled,
      limit: HISTORY_PAGE_SIZE,
      offset: page * HISTORY_PAGE_SIZE,
    })
      .then((result) => {
        if (id !== requestId.current) return;
        if (result.ok) {
          setHistory(result.data);
          setError(null);
        } else {
          setError(result.error);
        }
      })
      .catch(() => {
        if (id === requestId.current) {
          setError("No se pudo consultar el histórico. Revisa la conexión.");
        }
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [from, to, bucket, payment, includeCancelled, page]);

  const applyPreset = useCallback(
    (id: Exclude<PresetId, "custom">) => {
      setPreset(id);
      setRange(presetRange(id, state.todayKey));
      setBucket(PRESET_BUCKET[id]);
      setPage(0);
    },
    [state.todayKey],
  );

  const applyCustom = useCallback((next: Partial<Range>) => {
    setPreset("custom");
    setRange((current) => ({ ...current, ...next }));
    setPage(0);
  }, []);

  /** Abrir un periodo: el rango se ciñe a él y se baja un nivel de detalle. */
  const zoom = useCallback((period: SalesPeriod) => {
    setPreset("custom");
    setRange({ from: period.key, to: period.end });
    setBucket((current) => ZOOM[current]);
    setPage(0);
  }, []);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const result = await salesHistory({
        from,
        to,
        bucket,
        payment: payment === "" ? null : payment,
        includeCancelled,
        limit: HISTORY_EXPORT_MAX,
        offset: 0,
      });
      if (!result.ok) {
        notify("No se pudo exportar", result.error, "warn");
        return;
      }

      const rows = [CSV_HEADERS, ...ticketRows(result.data.orders, tz)];
      // El BOM es lo que hace que Excel abra los acentos bien.
      const csv = `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`;
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `ventas-${result.data.from ?? "inicio"}-a-${result.data.to ?? "hoy"}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      notify(
        "Histórico exportado",
        result.data.orderCount > result.data.orders.length
          ? `Se descargaron los ${result.data.orders.length} tickets más recientes del rango (el tope por archivo es ${HISTORY_EXPORT_MAX}).`
          : `${result.data.orders.length} tickets en el archivo.`,
      );
    } catch {
      notify("No se pudo exportar", "Se perdió la conexión.", "warn");
    } finally {
      setExporting(false);
    }
  }, [from, to, bucket, payment, includeCancelled, notify, tz]);

  const totals = history?.totals;
  const periods = history?.periods ?? [];
  // Con `reduce` en vez de `Math.max(...)`: «todo el histórico» agrupado por
  // día son miles de periodos, y esparcirlos como argumentos revienta la pila.
  const maxPeriod = periods.reduce((max, p) => Math.max(max, p.total), 1);
  const topMax = Math.max(history?.topProducts[0]?.qty ?? 1, 1);
  const ticketPromedio =
    totals && totals.tickets ? Math.round(totals.total / totals.tickets) : 0;
  const pages = history ? Math.ceil(history.orderCount / HISTORY_PAGE_SIZE) : 0;
  const label = rangeText(range, history);

  return (
    <div className="space-y-5">
      {/* -------------------------------- Filtros -------------------------------- */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="eyebrow">Histórico de ventas</p>
          <p className="text-[10px] font-bold text-muted">
            {history?.firstSaleDay
              ? `Desde la primera venta: ${dayKeyLabel(history.firstSaleDay, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`
              : "Sin ventas registradas"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id as Exclude<PresetId, "custom">)}
              aria-pressed={preset === p.id}
              className={cx(
                "focus-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition",
                preset === p.id
                  ? "bg-ink text-paper"
                  : "border border-line bg-white text-ink hover:border-matcha hover:text-matcha-deep",
              )}
            >
              {preset === p.id ? <span aria-hidden>✓</span> : null}
              {p.label}
            </button>
          ))}
          {preset === "custom" ? (
            <Badge tone="matcha">Rango a la medida</Badge>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Desde
            </span>
            <input
              type="date"
              value={range.from ?? ""}
              max={range.to ?? undefined}
              onChange={(e) => applyCustom({ from: e.target.value || null })}
              className="focus-ring mt-1.5 w-full rounded-xl2 border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Hasta
            </span>
            <input
              type="date"
              value={range.to ?? ""}
              min={range.from ?? undefined}
              onChange={(e) => applyCustom({ to: e.target.value || null })}
              className="focus-ring mt-1.5 w-full rounded-xl2 border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Agrupar por
            </span>
            <Select
              value={bucket}
              onChange={(e) => {
                setBucket(e.target.value as HistoryBucket);
                setPage(0);
              }}
              className="mt-1.5"
            >
              {HISTORY_BUCKETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Método de pago
            </span>
            <Select
              value={payment}
              onChange={(e) => {
                setPayment(e.target.value as PaymentMethod | "");
                setPage(0);
              }}
              className="mt-1.5"
            >
              <option value="">Todos</option>
              {(Object.keys(PAYMENT_META) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_META[m].label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-ink">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(e) => {
                setIncludeCancelled(e.target.checked);
                setPage(0);
              }}
              className="focus-ring h-4 w-4 rounded border-line accent-matcha-deep"
            />
            Mostrar tickets anulados en la lista
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void exportCsv()}
            disabled={exporting || !history?.orderCount}
          >
            {exporting ? "Preparando…" : "Descargar CSV"}
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="border-danger/30 bg-danger/5">
          <p className="text-sm font-bold text-danger">
            No se pudo leer el histórico
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">{error}</p>
        </Card>
      ) : null}

      <div
        className={cx(
          "space-y-5 transition-opacity",
          loading && "pointer-events-none opacity-50",
        )}
        aria-busy={loading}
      >
        {/* -------------------------------- Resumen ------------------------------ */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <div className="card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Ingresos
            </p>
            <p className="display mt-1.5 text-2xl text-ink">
              {money(totals?.total ?? 0, currency)}
            </p>
            <p className="mt-1 text-xs text-muted">{label}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Tickets
            </p>
            <p className="display mt-1.5 text-2xl text-ink">
              {totals?.tickets ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted">
              {totals?.cancelados
                ? `${totals.cancelados} anulado${totals.cancelados === 1 ? "" : "s"}`
                : "Sin anulaciones"}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Ticket promedio
            </p>
            <p className="display mt-1.5 text-2xl text-ink">
              {money(ticketPromedio, currency)}
            </p>
            <p className="mt-1 text-xs text-muted">Por pedido</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Piezas
            </p>
            <p className="display mt-1.5 text-2xl text-ink">
              {totals?.units ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted">Bebidas y bakery</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Propinas
            </p>
            <p className="display mt-1.5 text-2xl text-ink">
              {money(totals?.tip ?? 0, currency)}
            </p>
            <p className="mt-1 text-xs text-muted">Incluidas en ingresos</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Descuentos
            </p>
            <p className="display mt-1.5 text-2xl text-ink">
              {money(totals?.discount ?? 0, currency)}
            </p>
            <p className="mt-1 text-xs text-muted">Lo que no se cobró</p>
          </div>
        </div>

        {/* ------------------------------- Periodos ------------------------------ */}
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow">
              Ventas por{" "}
              {HISTORY_BUCKETS.find((b) => b.id === bucket)?.label.toLowerCase()} ·{" "}
              {label}
            </p>
            <p className="text-[10px] font-bold text-muted">Zona horaria: {tz}</p>
          </div>

          {periods.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                    <th className="pb-2 font-extrabold">Periodo</th>
                    <th className="pb-2 text-right font-extrabold">Tickets</th>
                    <th className="pb-2 text-right font-extrabold">Piezas</th>
                    <th className="pb-2 text-right font-extrabold">Propina</th>
                    <th className="pb-2 text-right font-extrabold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.key} className="border-t border-line">
                      <td className="py-2.5 pr-3">
                        <button
                          type="button"
                          onClick={() => zoom(period)}
                          className="focus-ring rounded-lg text-left font-bold capitalize text-ink hover:text-matcha-deep"
                          title="Ver el detalle de este periodo"
                        >
                          {periodLabel(period, bucket)}
                        </button>
                        <span className="mt-1 block h-1.5 max-w-[16rem] overflow-hidden rounded-full bg-cream">
                          <span
                            className="block h-full rounded-full bg-matcha"
                            style={{
                              width: `${Math.max((period.total / maxPeriod) * 100, 2)}%`,
                            }}
                          />
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-ink">
                        {period.tickets}
                        {period.cancelados ? (
                          <span className="ml-1 text-[10px] font-bold text-amber">
                            +{period.cancelados} anul.
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 text-right text-muted">{period.units}</td>
                      <td className="py-2.5 text-right text-muted">
                        {money(period.tip, currency)}
                      </td>
                      <td className="py-2.5 text-right font-extrabold text-ink">
                        {money(period.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              {loading
                ? "Consultando el histórico…"
                : "No hubo ventas en este rango. Prueba con otro periodo."}
            </p>
          )}
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* ---------------------------- Top productos -------------------------- */}
          <Card>
            <p className="eyebrow">Top productos · {label}</p>
            <div className="mt-4 space-y-3">
              {(history?.topProducts ?? []).map((entry, i) => {
                // Mismo criterio que el resto de reportes: un producto borrado
                // del menú se sigue contando y se marca, no desaparece.
                const live = entry.productId
                  ? state.products.some((p) => p.id === entry.productId)
                  : false;
                return (
                  <div
                    key={`${entry.productId ?? entry.name}:${i}`}
                    className="flex items-center gap-3"
                  >
                    <span className="w-5 text-center text-sm font-extrabold text-muted">
                      {i + 1}
                    </span>
                    <span className="text-lg" aria-hidden>
                      {entry.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-bold text-ink">
                          {entry.name}
                          {live ? null : (
                            <span className="ml-1.5 text-[10px] font-bold text-muted">
                              (fuera del menú)
                            </span>
                          )}
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
                );
              })}
              {!history?.topProducts.length ? (
                <p className="rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                  Sin productos vendidos en este rango.
                </p>
              ) : null}
            </div>
          </Card>

          {/* ---------------------------- Métodos de pago ------------------------ */}
          <Card>
            <p className="eyebrow">Métodos de pago · {label}</p>
            <ul className="mt-4 space-y-2.5">
              {(Object.keys(PAYMENT_META) as PaymentMethod[]).map((method) => {
                const amount = totals?.byPayment[method] ?? 0;
                const pct = totals?.total ? (amount / totals.total) * 100 : 0;
                return (
                  <li key={method}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-bold text-ink">
                        {PAYMENT_META[method].label}
                      </span>
                      <span className="text-xs font-extrabold text-muted">
                        {Math.round(pct)}% · {money(amount, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
                      <div
                        className="h-full rounded-full bg-matcha-deep"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs leading-5 text-muted">
              Tarjeta y Mercado Pago se registran en la aplicación, no se cobran
              desde ella: el importe es el que capturó la caja.
            </p>
          </Card>
        </div>

        {/* -------------------------------- Tickets ------------------------------ */}
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow">Tickets · {label}</p>
            <p className="text-[10px] font-bold text-muted">
              {history?.orderCount ?? 0} en el rango
            </p>
          </div>

          {history?.orders.length ? (
            <>
              <ul className="mt-2">
                {history.orders.map((order) => (
                  <HistoryTicket key={order.id} order={order} />
                ))}
              </ul>

              {pages > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold text-muted">
                    Página {page + 1} de {pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0 || loading}
                    >
                      Anteriores
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                      disabled={page >= pages - 1 || loading}
                    >
                      Siguientes
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-4 rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              {loading
                ? "Consultando el histórico…"
                : "No hay tickets que mostrar con estos filtros."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
