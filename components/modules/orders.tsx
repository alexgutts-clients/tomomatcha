"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelOrder, deleteOrder, moveOrder } from "@/lib/actions";
import { useDerived, useStore } from "@/lib/store";
import { dayKey, minutesSince, money, time } from "@/lib/format";
import {
  ORDER_FLOW,
  PAYMENT_META,
  SERVICE_META,
  STATUS_META,
  type Order,
  type OrderStatus,
} from "@/lib/types";
import { Icons } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  PageHeader,
  cx,
} from "@/components/ui";

const COLUMN_TONE: Record<
  OrderStatus,
  "neutral" | "matcha" | "amber" | "ink" | "danger"
> = {
  nuevo: "amber",
  preparando: "matcha",
  listo: "ink",
  entregado: "neutral",
  cancelado: "danger",
};

const EMPTY_COPY: Record<OrderStatus, string> = {
  nuevo: "Cobra en el punto de venta para ver pedidos aquí.",
  preparando: "Sin pedidos en preparación.",
  listo: "Sin pedidos listos por entregar.",
  entregado: "Aún no hay entregas hoy.",
  cancelado: "Sin cancelaciones.",
};

const DELIVERED_CAP = 6;

/**
 * Minutos de espera a partir de los cuales la comanda se marca. El cliente
 * pidió que el pedido que se está tardando salte a la vista en rojo.
 */
const WAIT_WARN_MIN = 6;
const WAIT_LATE_MIN = 10;

/* ------------------------------ Tarjeta de pedido ----------------------------- */

function OrderCard({ order }: { order: Order }) {
  const { state, tz, currency, submit, busy } = useStore();
  const delivered = order.status === "entregado";
  const waited = minutesSince(order.createdAt);
  const isAdmin = state.role === "admin";

  const late = !delivered && order.status !== "cancelado" && waited >= WAIT_LATE_MIN;

  return (
    <Card className={cx("animate-rise", late && "border-danger/50 bg-danger/5")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-ink">
          #{order.folio}
          <span className="ml-2 text-xs font-bold text-muted">
            {time(order.createdAt, tz)}
          </span>
        </p>
        {delivered ? (
          order.deliveredAt ? (
            <Badge tone="neutral">✔ {time(order.deliveredAt, tz)}</Badge>
          ) : null
        ) : (
          <Badge
            tone={
              waited >= WAIT_LATE_MIN
                ? "danger"
                : waited >= WAIT_WARN_MIN
                  ? "amber"
                  : "neutral"
            }
          >
            hace {waited} min
          </Badge>
        )}
      </div>

      <p className="mt-1.5">
        <Badge tone={order.serviceMode === "llevar" ? "ink" : "matcha"}>
          {SERVICE_META[order.serviceMode].emoji}{" "}
          {SERVICE_META[order.serviceMode].label}
        </Badge>
      </p>

      {order.customerName ? (
        <p className="mt-1 text-xs text-muted">
          <span aria-hidden>👤</span> {order.customerName}
        </p>
      ) : null}

      <div className="mt-3 space-y-2.5">
        {order.items.map((item, idx) => {
          const details: string[] = [];
          if (item.modifiers.milkName) details.push(item.modifiers.milkName);
          if (item.modifiers.sweetness !== undefined) {
            details.push(
              item.modifiers.sweetness === 0
                ? "Sin azúcar"
                : `${item.modifiers.sweetness}% dulzor`,
            );
          }
          if (item.modifiers.temperature) {
            details.push(
              item.modifiers.temperature === "caliente" ? "Caliente" : "Frío",
            );
          }
          for (const extra of item.modifiers.extras ?? []) {
            details.push(extra.name);
          }
          return (
            <div key={idx}>
              <p className="text-sm font-bold text-ink">
                {item.qty}× <span aria-hidden>{item.emoji}</span> {item.name}
              </p>
              {details.length ? (
                <p className="mt-0.5 text-xs leading-5 text-muted">
                  {details.join(" · ")}
                </p>
              ) : null}
              {item.modifiers.notes ? (
                <p className="mt-0.5 text-xs italic leading-5 text-muted">
                  <span aria-hidden>📝</span> {item.modifiers.notes}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-sm font-extrabold text-ink">
          {money(order.total, currency)}
          {order.tip > 0 ? (
            <span className="ml-2 text-[11px] font-bold text-muted">
              incluye {money(order.tip, currency)} de propina
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{PAYMENT_META[order.payment].short}</Badge>
          {order.pointsEarned ? (
            <span className="text-[11px] font-extrabold text-matcha-deep">
              +{order.pointsEarned} pts
            </span>
          ) : null}
        </div>
      </div>

      {order.status !== "entregado" && order.status !== "cancelado" ? (
        <div className="mt-3 flex items-center gap-2">
          {order.status !== "nuevo" ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label="Regresar estado"
              onClick={() =>
                void submit(() => moveOrder(order.id, -1), { silent: true })
              }
            >
              ←
            </Button>
          ) : null}
          <Button
            variant="matcha"
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={() =>
              void submit(() => moveOrder(order.id, 1), { silent: true })
            }
          >
            {STATUS_META[order.status].action}
          </Button>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
          {order.status !== "cancelado" ? (
            <ConfirmButton
              label="Cancelar ticket"
              confirmLabel="Sí, cancelar"
              question="Se devuelven insumos y puntos."
              disabled={busy}
              onConfirm={() =>
                void submit(() => cancelOrder(order.id), {
                  title: `Ticket #${order.folio} cancelado`,
                  detail: "Se devolvieron los insumos y los puntos.",
                })
              }
            />
          ) : null}
          {/*
           * Borrar es distinto de cancelar: el ticket desaparece de la base.
           * Está aquí para poder limpiar pruebas, porque hasta que la venta no
           * se va no se puede borrar el producto que la generó ni el insumo de
           * su receta.
           */}
          <ConfirmButton
            label="Borrar ticket"
            confirmLabel="Sí, borrar"
            question="Desaparece del histórico y de los reportes. No se puede deshacer."
            disabled={busy}
            onConfirm={() =>
              void submit(() => deleteOrder(order.id), {
                title: (data) => `Ticket #${data.folio} borrado`,
                detail:
                  order.status === "cancelado"
                    ? "Se eliminó del histórico."
                    : "Se devolvieron insumos y puntos, y se eliminó del histórico.",
              })
            }
          />
        </div>
      ) : null}
    </Card>
  );
}

/* --------------------------------- Módulo ------------------------------------ */

export function OrdersModule() {
  const { state, tz, submit, busy } = useStore();
  const { activeOrders, todayKey } = useDerived();
  const [showCancelled, setShowCancelled] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Modo barra: el tablero ocupa toda la pantalla del iPad, sin menús alrededor.
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void boardRef.current?.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const deliveredToday = state.orders
    .filter(
      (o) => o.status === "entregado" && dayKey(o.createdAt, tz) === todayKey,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const cancelledToday = state.orders
    .filter(
      (o) => o.status === "cancelado" && dayKey(o.createdAt, tz) === todayKey,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const columns = ORDER_FLOW.map((status) => {
    if (status === "entregado") {
      return {
        status,
        orders: deliveredToday.slice(0, DELIVERED_CAP),
        extra: Math.max(deliveredToday.length - DELIVERED_CAP, 0),
        count: deliveredToday.length,
      };
    }
    const list = state.orders
      .filter((o) => o.status === status)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { status, orders: list, extra: 0, count: list.length };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Barra · flujo de pedidos"
        title="Comandas"
        desc="Cada pedido avanza por cuatro estados: nuevo, en preparación, listo y entregado. El tablero se actualiza solo cada pocos segundos."
        actions={
          <>
            <Button variant="ghost" onClick={toggleFullscreen}>
              {fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            </Button>
            <Link
              href="/pos"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition hover:border-matcha hover:text-matcha-deep"
            >
              + Nueva venta
            </Link>
          </>
        }
      />

      {!activeOrders.length ? (
        <EmptyState
          emoji="🔔"
          title="La barra está al día"
          desc="No hay pedidos activos en este momento. Al cobrar en el punto de venta, la comanda aparece aquí al instante."
          action={
            <Link
              href="/pos"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-matcha-deep px-5 py-2.5 text-sm font-bold text-paper shadow-pop transition hover:bg-matcha"
            >
              <Icons.pos className="h-4 w-4" />
              Abrir punto de venta
            </Link>
          }
        />
      ) : null}

      <div
        ref={boardRef}
        className={cx(
          "scrollbar-slim flex snap-x gap-4 overflow-x-auto pb-4 xl:grid xl:grid-cols-4 xl:overflow-visible xl:pb-0",
          fullscreen && "overflow-y-auto bg-paper p-6",
        )}
      >
        {columns.map((col) => (
          <section
            key={col.status}
            aria-label={`Columna ${STATUS_META[col.status].label}`}
            className="min-w-[280px] snap-start xl:min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-ink">
                {STATUS_META[col.status].label}
              </h2>
              <Badge tone={COLUMN_TONE[col.status]}>{col.count}</Badge>
            </div>
            <div className="mt-3 space-y-3">
              {col.orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {!col.orders.length ? (
                <p className="rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-xs leading-5 text-muted">
                  {EMPTY_COPY[col.status]}
                </p>
              ) : null}
              {col.extra > 0 ? (
                <p className="text-center text-xs text-muted">
                  +{col.extra} entregadas hoy
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {cancelledToday.length ? (
        <div>
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            aria-expanded={showCancelled}
            className="focus-ring inline-flex items-center gap-2 rounded-full text-xs font-extrabold text-muted hover:text-ink"
          >
            {cancelledToday.length} ticket
            {cancelledToday.length === 1 ? "" : "s"} cancelado
            {cancelledToday.length === 1 ? "" : "s"} hoy
            <span aria-hidden>{showCancelled ? "▴" : "▾"}</span>
          </button>
          {showCancelled ? (
            <ul className="mt-3 space-y-2">
              {cancelledToday.map((order) => (
                <li
                  key={order.id}
                  className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-bold text-ink">
                    #{order.folio}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {time(order.createdAt, tz)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-muted line-through">
                      {money(order.total, state.settings.currency)}
                    </span>
                    {state.role === "admin" ? (
                      <ConfirmButton
                        label="Borrar"
                        confirmLabel="Sí, borrar"
                        question="Desaparece del histórico. No se puede deshacer."
                        disabled={busy}
                        onConfirm={() =>
                          void submit(() => deleteOrder(order.id), {
                            title: (data) => `Ticket #${data.folio} borrado`,
                            detail: "Se eliminó del histórico.",
                          })
                        }
                      />
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
