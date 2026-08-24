"use client";

import { useState } from "react";
import {
  acknowledgePreparedItem,
  discardPreparedItem,
  savePreparedItem,
  type PreparedItemInput,
} from "@/lib/actions";
import { useStore } from "@/lib/store";
import { shortDate, unitLabel } from "@/lib/format";
import {
  EXPIRY_META,
  UNIT_LABELS,
  daysUntil,
  expiryLevel,
  type ExpiryLevel,
  type PreparedItem,
  type Unit,
} from "@/lib/types";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
  Textarea,
  cx,
} from "@/components/ui";

type Filter = "todos" | "critico" | "bien";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "critico", label: "Críticos" },
  { id: "bien", label: "En buen estado" },
];

/** Cuenta regresiva en palabras: 5 días → 4 → … → hoy → caducado. */
function countdownLabel(days: number): string {
  if (days < 0) return `Caducó hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Caduca hoy";
  if (days === 1) return "Caduca mañana";
  return `Faltan ${days} días`;
}

function emptyForm(todayKey: string): PreparedItemInput {
  const inDays = (n: number) => {
    const [y, m, d] = todayKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + n));
    return date.toISOString().slice(0, 10);
  };
  return {
    name: "",
    qty: 1,
    unit: "pza",
    producedOn: todayKey,
    expiresOn: inDays(5),
    notes: "",
  };
}

export function PreparedModule() {
  const { state, submit, busy } = useStore();
  const [filter, setFilter] = useState<Filter>("todos");
  const [form, setForm] = useState<PreparedItemInput | null>(null);

  if (state.role === "empleado") return <AccessGate module="Productos preparados" />;

  const today = state.todayKey;
  const items = state.preparedItems.map((item) => {
    const days = daysUntil(item.expiresOn, today);
    return { item, days, level: expiryLevel(days) };
  });

  const needsAttention = items.filter(
    (e) =>
      (e.level === "critico" || e.level === "caducado") &&
      !e.item.acknowledgedAt,
  );
  const criticalCount = items.filter(
    (e) => e.level === "critico" || e.level === "caducado",
  ).length;

  const visible = items
    .filter((e) => {
      if (filter === "critico") {
        return e.level === "critico" || e.level === "caducado";
      }
      if (filter === "bien") {
        return e.level === "ok" || e.level === "pronto";
      }
      return true;
    })
    .sort((a, b) => a.days - b.days);

  const counts: Record<Filter, number> = {
    todos: items.length,
    critico: criticalCount,
    bien: items.length - criticalCount,
  };

  const submitForm = async () => {
    if (!form) return;
    const saved = await submit(() => savePreparedItem(form), {
      title: form.id ? "Lote actualizado" : "Lote registrado",
      detail: form.name,
    });
    if (saved) setForm(null);
  };

  const editItem = (item: PreparedItem) =>
    setForm({
      id: item.id,
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      producedOn: item.producedOn,
      expiresOn: item.expiresOn,
      notes: item.notes,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cocina · caducidades"
        title="Productos preparados"
        desc="Mermeladas, jarabes, roles, pasteles: lo que se elabora en casa. El sistema cuenta los días que faltan y avisa antes de que se venza."
        actions={
          <Button variant="matcha" onClick={() => setForm(emptyForm(today))}>
            + Nuevo lote
          </Button>
        }
      />

      {/* -------------------------- Alertas sin atender -------------------------- */}
      {needsAttention.length ? (
        <Card className="border-danger/40 bg-danger/5">
          <p className="text-sm font-extrabold text-danger">
            {needsAttention.length} lote{needsAttention.length === 1 ? "" : "s"}{" "}
            necesita{needsAttention.length === 1 ? "" : "n"} tu atención
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Este aviso no desaparece solo: marca cada lote como atendido cuando lo
            revises, o deséchalo si ya no sirve.
          </p>
          <ul className="mt-3 space-y-2">
            {needsAttention.map(({ item, days }) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-danger/25 bg-white px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">
                    {item.name}
                  </span>
                  <span className="text-xs text-danger">
                    {countdownLabel(days)}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void submit(() => acknowledgePreparedItem(item.id), {
                        title: "Alerta atendida",
                        detail: item.name,
                      })
                    }
                  >
                    Ya lo revisé
                  </Button>
                  <ConfirmButton
                    label="Desechar"
                    confirmLabel="Sí, desechar"
                    disabled={busy}
                    onConfirm={() =>
                      void submit(() => discardPreparedItem(item.id), {
                        title: "Lote desechado",
                        detail: item.name,
                      })
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!items.length ? (
        <EmptyState
          emoji="🧁"
          title="Todavía no hay productos preparados"
          desc="Registra cada lote que salga de cocina con su fecha de caducidad y el sistema llevará la cuenta regresiva por ti."
          action={
            <Button variant="matcha" onClick={() => setForm(emptyForm(today))}>
              Registrar el primero
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Lotes activos" value={items.length} hint="Sin desechar" />
            <Stat
              label="Críticos"
              value={criticalCount}
              hint={criticalCount ? "Caducan hoy o mañana" : "Nada por vencer"}
              tone={criticalCount ? "amber" : "neutral"}
            />
            <Stat
              label="Sin atender"
              value={needsAttention.length}
              hint="Alertas pendientes de revisar"
              tone={needsAttention.length ? "amber" : "neutral"}
            />
            <Stat
              label="Próximo a vencer"
              value={
                visible[0] ? (
                  <span className="text-lg leading-6">{visible[0].item.name}</span>
                ) : (
                  "—"
                )
              }
              hint={visible[0] ? countdownLabel(visible[0].days) : ""}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cx(
                  "focus-ring rounded-full px-4 py-2 text-xs font-extrabold transition",
                  filter === f.id
                    ? "bg-ink text-paper"
                    : "border border-line bg-white text-ink hover:border-matcha hover:text-matcha-deep",
                )}
              >
                {f.label} · {counts[f.id]}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {visible.map(({ item, days, level }) => (
              <PreparedRow
                key={item.id}
                item={item}
                days={days}
                level={level}
                onEdit={() => editItem(item)}
              />
            ))}
            {!visible.length ? (
              <p className="rounded-xl2 border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
                Ningún lote en este filtro.
              </p>
            ) : null}
          </div>
        </>
      )}

      {/* ------------------------------ Alta y edición ------------------------------ */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar lote" : "Nuevo lote"}
      >
        {form ? (
          <div className="space-y-4">
            <Field label="Producto">
              <Input
                autoFocus
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Mermelada de fresa"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cantidad">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                />
              </Field>
              <Field label="Unidad">
                <Select
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value as Unit })
                  }
                >
                  {(Object.keys(UNIT_LABELS) as Unit[]).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit} · {UNIT_LABELS[unit]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Se elaboró">
                <Input
                  type="date"
                  value={form.producedOn}
                  onChange={(e) =>
                    setForm({ ...form, producedOn: e.target.value })
                  }
                />
              </Field>
              <Field label="Caduca" hint="De aquí sale la cuenta regresiva">
                <Input
                  type="date"
                  value={form.expiresOn}
                  min={form.producedOn}
                  onChange={(e) => setForm({ ...form, expiresOn: e.target.value })}
                />
              </Field>
            </div>

            {form.expiresOn ? (
              <p className="rounded-xl2 bg-cream px-4 py-2.5 text-xs font-bold text-ink">
                {countdownLabel(daysUntil(form.expiresOn, today))}
              </p>
            ) : null}

            <Field label="Notas" hint="Lote, tanda, dónde está guardado…">
              <Textarea
                rows={2}
                maxLength={400}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button
                variant="matcha"
                className="flex-1"
                disabled={busy || !form.name.trim() || !form.expiresOn}
                onClick={() => void submitForm()}
              >
                {form.id ? "Guardar cambios" : "Registrar lote"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/* --------------------------------- Renglón ----------------------------------- */

function PreparedRow({
  item,
  days,
  level,
  onEdit,
}: {
  item: PreparedItem;
  days: number;
  level: ExpiryLevel;
  onEdit: () => void;
}) {
  const { submit, busy } = useStore();
  const meta = EXPIRY_META[level];
  const urgent = level === "critico" || level === "caducado";

  return (
    <Card className={cx(urgent && "border-danger/50 bg-danger/5")}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0 flex-1 basis-full md:basis-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-ink">{item.name}</p>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {urgent && item.acknowledgedAt ? (
              <Badge tone="neutral">Revisado</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {unitLabel(item.qty, item.unit)} · elaborado{" "}
            {shortDate(`${item.producedOn}T12:00:00`)} · caduca{" "}
            {shortDate(`${item.expiresOn}T12:00:00`)}
          </p>
          {item.notes ? (
            <p className="mt-0.5 text-xs italic text-muted">«{item.notes}»</p>
          ) : null}
        </div>

        <p
          className={cx(
            "display whitespace-nowrap text-xl",
            urgent ? "text-danger" : "text-ink",
          )}
        >
          {countdownLabel(days)}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {urgent && !item.acknowledgedAt ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                void submit(() => acknowledgePreparedItem(item.id), {
                  title: "Alerta atendida",
                  detail: item.name,
                })
              }
            >
              Ya lo revisé
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" disabled={busy} onClick={onEdit}>
            Editar
          </Button>
          <ConfirmButton
            label="Desechar"
            confirmLabel="Sí, desechar"
            disabled={busy}
            onConfirm={() =>
              void submit(() => discardPreparedItem(item.id), {
                title: "Lote desechado",
                detail: item.name,
              })
            }
          />
        </div>
      </div>
    </Card>
  );
}
