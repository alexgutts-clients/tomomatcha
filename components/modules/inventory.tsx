"use client";

import { useState } from "react";
import {
  adjustStock,
  deleteIngredient,
  saveIngredient,
  setStock,
  type IngredientInput,
} from "@/lib/actions";
import { useDerived, useStore } from "@/lib/store";
import { unitLabel } from "@/lib/format";
import { UNIT_LABELS, type Ingredient, type Unit } from "@/lib/types";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  FlagGate,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
  cx,
} from "@/components/ui";

/* ------------------------------- Utilidades ---------------------------------- */

type StockFilter = "todos" | "alerta" | "ok";
type StockLevel = "critico" | "resurtir" | "ok";

const STEP: Record<Unit, number> = { g: 25, ml: 250, pza: 1 };

const LEVEL_META: Record<
  StockLevel,
  { label: string; tone: "danger" | "amber" | "matcha"; bar: string }
> = {
  critico: { label: "Crítico", tone: "danger", bar: "bg-danger" },
  resurtir: { label: "Resurtir", tone: "amber", bar: "bg-amber" },
  ok: { label: "En orden", tone: "matcha", bar: "bg-matcha" },
};

const FILTERS: { id: StockFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "alerta", label: "En alerta" },
  { id: "ok", label: "Correctos" },
];

function levelFor(ing: Ingredient): StockLevel {
  if (ing.min > 0 && ing.stock <= ing.min * 0.5) return "critico";
  if (ing.stock <= ing.min) return "resurtir";
  return "ok";
}

function ratioFor(ing: Ingredient): number {
  return ing.stock / Math.max(ing.min, 1);
}

const EMPTY_FORM: IngredientInput = {
  name: "",
  unit: "g",
  min: 0,
  weeklyUse: 0,
  stock: 0,
};

/* --------------------------------- Módulo ------------------------------------ */

export function InventoryModule() {
  const { state, submit, busy } = useStore();
  const { lowStock } = useDerived();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("todos");
  const [form, setForm] = useState<IngredientInput | null>(null);
  const [counting, setCounting] = useState<{ id: string; name: string; unit: Unit } | null>(
    null,
  );
  const [countValue, setCountValue] = useState("");

  if (state.role === "empleado") return <AccessGate module="Inventario" />;
  if (!state.flags.inventario) return <FlagGate module="Inventario" />;

  const activeMilks = state.milks.filter((m) => m.available).length;
  const nextOut = [...state.ingredients]
    .filter((i) => i.min > 0)
    .sort((a, b) => ratioFor(a) - ratioFor(b))[0];

  const counts: Record<StockFilter, number> = {
    todos: state.ingredients.length,
    alerta: lowStock.length,
    ok: state.ingredients.length - lowStock.length,
  };

  const query = search.trim().toLowerCase();
  const visible = state.ingredients
    .filter((ing) => {
      const matchesQuery = !query || ing.name.toLowerCase().includes(query);
      const isAlert = ing.stock <= ing.min;
      const matchesFilter =
        filter === "todos" || (filter === "alerta" ? isAlert : !isAlert);
      return matchesQuery && matchesFilter;
    })
    .sort((a, b) => {
      const aAlert = a.stock <= a.min;
      const bAlert = b.stock <= b.min;
      if (aAlert !== bAlert) return aAlert ? -1 : 1;
      if (aAlert && bAlert) {
        return ratioFor(a) - ratioFor(b) || a.name.localeCompare(b.name, "es");
      }
      return a.name.localeCompare(b.name, "es");
    });

  const submitForm = async () => {
    if (!form) return;
    const saved = await submit(() => saveIngredient(form), {
      title: form.id ? "Insumo actualizado" : "Insumo agregado",
      detail: form.name,
    });
    if (saved) setForm(null);
  };

  const submitCount = async () => {
    if (!counting) return;
    const value = Number(countValue);
    if (!Number.isFinite(value) || value < 0) return;
    const saved = await submit(() => setStock(counting.id, value), {
      title: "Conteo registrado",
      detail: `${counting.name}: ${unitLabel(value, counting.unit)}`,
    });
    if (saved !== null) {
      setCounting(null);
      setCountValue("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insumos · descuento por receta"
        title="Inventario"
        desc="Cada venta descuenta insumos automáticamente según la receta del producto, incluida la leche que elige el cliente. Todo movimiento queda registrado."
        actions={
          <Button variant="matcha" onClick={() => setForm({ ...EMPTY_FORM })}>
            + Nuevo insumo
          </Button>
        }
      />

      {state.ingredients.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="Todavía no hay insumos"
          desc="Registra matcha, leches, vasos y bakery para que cada venta descuente sola. Si prefieres empezar rápido, carga el catálogo sugerido desde Ajustes."
          action={
            <Button variant="matcha" onClick={() => setForm({ ...EMPTY_FORM })}>
              Registrar el primero
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Insumos registrados"
              value={state.ingredients.length}
              hint="Con descuento automático por venta"
            />
            <Stat
              label="En alerta"
              value={lowStock.length}
              hint={lowStock.length ? "Por debajo del mínimo" : "Nada por resurtir"}
              tone={lowStock.length ? "amber" : "neutral"}
            />
            <Stat
              label="Leches activas"
              value={activeMilks}
              hint={`De ${state.milks.length} opciones en carta`}
            />
            <Stat
              label="Próximo a agotarse"
              value={
                nextOut ? (
                  <span className="text-lg leading-6">{nextOut.name}</span>
                ) : (
                  "—"
                )
              }
              hint="Según nivel mínimo"
            />
          </div>

          {/* ------------------------------ Controles ------------------------------ */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar insumo…"
              aria-label="Buscar insumo por nombre"
              className="rounded-full sm:max-w-xs"
            />
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
          </div>

          {/* -------------------------------- Lista -------------------------------- */}
          {visible.length ? (
            <div className="space-y-2.5">
              {visible.map((ing) => {
                const meta = LEVEL_META[levelFor(ing)];
                const step = STEP[ing.unit];
                return (
                  <Card key={ing.id} className="p-4 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <div className="min-w-0 flex-1 basis-full md:basis-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-extrabold text-ink">
                            {ing.name}
                          </p>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Mínimo: {unitLabel(ing.min, ing.unit)} · Uso semanal:{" "}
                          {unitLabel(ing.weeklyUse, ing.unit)}
                        </p>
                      </div>

                      <div className="w-36 shrink-0" aria-hidden>
                        <div className="h-2 overflow-hidden rounded-full bg-cream">
                          <div
                            className={cx("h-full rounded-full", meta.bar)}
                            style={{
                              width: `${Math.min(ing.stock / Math.max(ing.min * 2, 1), 1) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <p className="display whitespace-nowrap text-xl text-ink">
                        {Math.round(ing.stock * 100) / 100}
                        <span className="ml-1 text-sm text-muted">{ing.unit}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void submit(
                              () => adjustStock(ing.id, -step, "merma"),
                              { silent: true },
                            )
                          }
                          disabled={ing.stock <= 0 || busy}
                          aria-label={`Restar ${unitLabel(step, ing.unit)} de ${ing.name}`}
                          className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-base font-extrabold text-ink transition hover:border-matcha hover:text-matcha-deep disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void submit(
                              () => adjustStock(ing.id, step, "entrada"),
                              { silent: true },
                            )
                          }
                          disabled={busy}
                          aria-label={`Sumar ${unitLabel(step, ing.unit)} a ${ing.name}`}
                          className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-base font-extrabold text-ink transition hover:border-matcha hover:text-matcha-deep disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setCounting({
                              id: ing.id,
                              name: ing.name,
                              unit: ing.unit,
                            });
                            setCountValue(String(Math.round(ing.stock * 100) / 100));
                          }}
                        >
                          Contar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            setForm({
                              id: ing.id,
                              name: ing.name,
                              unit: ing.unit,
                              min: ing.min,
                              weeklyUse: ing.weeklyUse,
                            })
                          }
                        >
                          Editar
                        </Button>
                        <ConfirmButton
                          label="Eliminar"
                          confirmLabel="Sí, eliminar"
                          disabled={busy}
                          onConfirm={() =>
                            void submit(() => deleteIngredient(ing.id), {
                              title: "Insumo eliminado",
                              detail: ing.name,
                            })
                          }
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              emoji="🔍"
              title="Sin resultados"
              desc="Ningún insumo coincide con la búsqueda o el filtro actual."
              action={
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setFilter("todos");
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          )}
        </>
      )}

      {/* ------------------------------ Alta y edición ------------------------------ */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar insumo" : "Nuevo insumo"}
      >
        {form ? (
          <div className="space-y-4">
            <Field label="Nombre">
              <Input
                autoFocus
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Matcha grado latte"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Unidad" hint="Cómo se mide este insumo">
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

              <Field label="Mínimo" hint="Debajo de esto se marca en alerta">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={form.min}
                  onChange={(e) =>
                    setForm({ ...form, min: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Uso semanal" hint="Referencia para resurtir (opcional)">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={form.weeklyUse}
                  onChange={(e) =>
                    setForm({ ...form, weeklyUse: Number(e.target.value) })
                  }
                />
              </Field>

              {!form.id ? (
                <Field
                  label="Existencia inicial"
                  hint="Lo que hay ahora en la barra"
                >
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={form.stock ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, stock: Number(e.target.value) })
                    }
                  />
                </Field>
              ) : (
                <div className="self-end rounded-xl2 bg-cream px-4 py-3 text-xs leading-5 text-muted">
                  La existencia se ajusta con los botones de la lista o con
                  «Contar», para que quede registro del movimiento.
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button
                variant="matcha"
                className="flex-1"
                disabled={busy || !form.name.trim()}
                onClick={() => void submitForm()}
              >
                {form.id ? "Guardar cambios" : "Agregar insumo"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* --------------------------------- Conteo --------------------------------- */}
      <Modal
        open={!!counting}
        onClose={() => setCounting(null)}
        title="Conteo físico"
      >
        {counting ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted">
              Captura lo que hay realmente de <strong>{counting.name}</strong>. La
              diferencia contra el sistema queda registrada como ajuste.
            </p>
            <Field label={`Cantidad contada (${counting.unit})`}>
              <Input
                autoFocus
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={countValue}
                onChange={(e) => setCountValue(e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setCounting(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="matcha"
                className="flex-1"
                disabled={busy || countValue.trim() === ""}
                onClick={() => void submitCount()}
              >
                Guardar conteo
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
