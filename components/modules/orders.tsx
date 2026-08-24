"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelOrder, moveOrder } from "@/lib/actions";
import { useDerived, useStore } from "@/lib/store";
import { dayKey, minutesSince, money, time } from "@/lib/format";
import {
  ORDER_FLOW,
  PAYMENT_META,
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

/* ------------------------------ Tarjeta de pedido ----------------------------- */

function OrderCard({ order }: { order: Order }) {
  const { state, tz, currency, submit, busy } = useStore();
  const delivered = order.status === "entregado";
  const waited = minutesSince(order.createdAt);
  const isAdmin = state.role === "admin";

  return (
    <Card className="animate-rise">
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
          <Badge tone={waited >= 10 ? "amber" : "neutral"}>hace {waited} min</Badge>
        )}
      </div>

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

      {isAdmin && order.status !== "cancelado" ? (
        <div className="mt-2.5 border-t border-line pt-2.5">
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
        </div>
      ) : null}
    </Card>
  );
}

/* --------------------------------- Módulo ------------------------------------ */

export function OrdersModule() {
  const { state, tz } = useStore();
  const { activeOrders, todayKey } = useDerived();
  const [showCancelled, setShowCancelled] = useState(false);

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
          <Link
            href="/pos"
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition hover:border-matcha hover:text-matcha-deep"
          >
            + Nueva venta
          </Link>
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

      <div className="scrollbar-slim flex snap-x gap-4 overflow-x-auto pb-4 xl:grid xl:grid-cols-4 xl:overflow-visible xl:pb-0">
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
                  <span className="text-xs text-muted line-through">
                    {money(order.total, state.settings.currency)}
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
