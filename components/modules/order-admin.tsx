"use client";

import { useState } from "react";
import { deleteOrder, deleteOrderItem } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { dayKey, money, time } from "@/lib/format";
import { PAYMENT_META, STATUS_META, type Order } from "@/lib/types";
import {
  AccessGate,
  Badge,
  Card,
  ConfirmButton,
  EmptyState,
  PageHeader,
  Stat,
  cx,
} from "@/components/ui";

/* ============================================================================
 * Administración de pedidos.
 *
 * Sirve para deshacer capturas: quitar un producto suelto de un ticket, o
 * borrar el ticket entero. Es distinto de anular, que conserva la venta porque
 * ocurrió de verdad; aquí el dato desaparece de la base.
 *
 * Existe porque durante las pruebas se captura mucho, y hay un encadenamiento
 * que obliga a empezar por aquí: mientras la venta exista no se puede borrar el
 * producto que se vendió, y mientras el producto exista no se puede borrar el
 * insumo de su receta.
 *
 * Sólo administradores, por lo mismo: es la única parte del sistema que destruye
 * histórico sin dejar rastro.
 * ========================================================================== */

function OrderRow({ order }: { order: Order }) {
  const { state, currency, tz, submit, busy } = useStore();
  const [open, setOpen] = useState(false);

  const cancelled = order.status === "cancelado";
  const single = order.items.length <= 1;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="focus-ring min-w-0 flex-1 rounded-lg text-left"
        >
          <p className="text-sm font-extrabold text-ink">
            #{order.folio}
            <span className="ml-2 text-xs font-normal text-muted">
              {time(order.createdAt, tz)} · {dayKey(order.createdAt, tz)}
            </span>
            <span aria-hidden className="ml-2 text-muted">
              {open ? "▴" : "▾"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {order.items.length} producto{order.items.length === 1 ? "" : "s"} ·{" "}
            {PAYMENT_META[order.payment].short}
            {order.createdByName ? ` · ${order.createdByName}` : ""}
          </p>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={cx(
              "text-sm font-extrabold",
              cancelled ? "text-muted line-through" : "text-ink",
            )}
          >
            {money(order.total, currency)}
          </span>
          <Badge tone={cancelled ? "amber" : "neutral"}>
            {STATUS_META[order.status].label}
          </Badge>
          <ConfirmButton
            label="Borrar ticket"
            confirmLabel="Sí, borrar"
            question="Desaparece del histórico. No se puede deshacer."
            disabled={busy}
            onConfirm={() =>
              void submit(() => deleteOrder(order.id), {
                title: (data) => `Ticket #${data.folio} borrado`,
                detail: cancelled
                  ? "Se eliminó del histórico."
                  : "Se devolvieron insumos y puntos.",
              })
            }
          />
        </div>
      </div>

      {open ? (
        <ul className="mt-3 space-y-2 border-t border-line pt-3">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl2 bg-cream px-3.5 py-2.5"
            >
              <span className="min-w-0 flex-1 text-sm text-ink">
                <span aria-hidden className="mr-1.5">
                  {item.emoji}
                </span>
                <span className="font-bold">
                  {item.qty}× {item.name}
                </span>
                {item.modifiers.milkName ? (
                  <span className="ml-2 text-xs text-muted">
                    {item.modifiers.milkName}
                  </span>
                ) : null}
              </span>
              <span className="text-xs font-extrabold text-muted">
                {money((item.unitPrice + item.modsPrice) * item.qty, currency)}
              </span>
              {/*
               * El último renglón no se puede quitar: un ticket vacío no
               * significa nada, y para ese caso está borrar el ticket entero.
               */}
              {single ? (
                <span className="text-[11px] font-bold text-muted">
                  Único producto
                </span>
              ) : (
                <ConfirmButton
                  label="Quitar"
                  confirmLabel="Sí, quitar"
                  question="Se devuelven sus insumos y se recalcula el ticket."
                  disabled={busy}
                  onConfirm={() =>
                    void submit(() => deleteOrderItem(item.id), {
                      title: "Producto quitado del ticket",
                      detail: `${item.name} · ticket #${order.folio}`,
                    })
                  }
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {open && order.tip > 0 ? (
        <p className="mt-2 text-xs text-muted">
          Incluye {money(order.tip, currency)} de propina, que se conserva al
          quitar productos.
        </p>
      ) : null}

      {open && state.cashCloses.some((c) => c.dateKey === dayKey(order.createdAt, tz)) ? (
        <p className="mt-2 text-xs font-bold text-danger">
          El corte de este día ya se cerró: el ticket ya no se puede modificar.
        </p>
      ) : null}
    </Card>
  );
}

export function OrderAdminModule() {
  const { state, currency, tz } = useStore();
  const [onlyToday, setOnlyToday] = useState(false);

  if (state.role === "empleado") {
    return <AccessGate module="Administración de pedidos" />;
  }

  const orders = [...state.orders]
    .filter((o) => !onlyToday || dayKey(o.createdAt, tz) === state.todayKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const sales = orders.filter((o) => o.status !== "cancelado");
  const importe = sales.reduce((sum, o) => sum + o.total, 0);
  const productos = orders.reduce(
    (n, o) => n + o.items.reduce((k, it) => k + it.qty, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Solo administración"
        title="Administración de pedidos"
        desc="Quita un producto suelto de un ticket, o borra el ticket completo. A diferencia de anular, aquí el dato desaparece de la base: sirve para deshacer capturas de prueba."
        actions={
          <button
            type="button"
            onClick={() => setOnlyToday((v) => !v)}
            aria-pressed={onlyToday}
            className={cx(
              "focus-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition",
              onlyToday
                ? "bg-ink text-paper"
                : "border border-line bg-white text-ink hover:border-matcha hover:text-matcha-deep",
            )}
          >
            {onlyToday ? <span aria-hidden>✓</span> : null}
            Solo hoy
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          label="Tickets"
          value={orders.length}
          hint={onlyToday ? "de hoy" : "del histórico cargado"}
        />
        <Stat label="Productos" value={productos} hint="Renglones cobrados" />
        <Stat
          label="Importe"
          value={money(importe, currency)}
          hint="Sin contar cancelados"
        />
      </div>

      <div className="rounded-xl2 border border-line bg-cream px-4 py-3.5">
        <p className="text-xs leading-5 text-muted">
          <strong className="text-ink">Antes de borrar un producto o un insumo</strong>{" "}
          hay que borrar aquí las ventas que lo usaron: mientras la venta exista,
          el producto no se puede eliminar, y mientras el producto exista, su
          insumo tampoco. Los tickets de un día con el corte ya cerrado no se
          pueden tocar.
        </p>
      </div>

      {orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="🧾"
          title={onlyToday ? "Hoy no hay pedidos" : "Todavía no hay pedidos"}
          desc="En cuanto se cobre en el punto de venta, los tickets aparecerán aquí para poder corregirlos."
        />
      )}
    </div>
  );
}
