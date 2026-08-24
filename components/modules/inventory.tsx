"use client";

import { useMemo, useState } from "react";
import {
  adjustStock,
  deleteIngredient,
  receiveStock,
  saveIngredient,
  setStock,
  type IngredientInput,
} from "@/lib/actions";
import { saveProduct } from "@/lib/actions-admin";
import { useDerived, useStore } from "@/lib/store";
import { unitLabel } from "@/lib/format";
import {
  stockLevel,
  thresholdPct,
  UNIT_LABELS,
  type Ingredient,
  type StockLevel,
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
  FlagGate,
  Input,
  Modal,
  PageHeader,
  Select,
  Stat,
  Toggle,
  cx,
} from "@/components/ui";

/* ------------------------------- Utilidades ---------------------------------- */

type StockFilter = "todos" | "alerta" | "ok";

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

function ratioFor(ing: Ingredient): number {
  return ing.stock / Math.max(ing.min, 1);
}

const EMPTY_FORM: IngredientInput = {
  name: "",
  unit: "g",
  min: 0,
  weeklyUse: 0,
  isPackaging: false,
  parLevel: null,
  stock: 0,
};

/* --------------------------------- Módulo ------------------------------------ */

export function InventoryModule() {
  const { state, submit, busy } = useStore();
  const { lowStock } = useDerived();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("todos");
  const [form, setForm] = useState<IngredientInput | null>(null);
  const [recipeFor, setRecipeFor] = useState<Ingredient | null>(null);
  const [entry, setEntry] = useState<{
    ingredient: Ingredient;
    mode: "recibir" | "contar";
  } | null>(null);
  const [entryValue, setEntryValue] = useState("");

  /**
   * Índice inverso de la receta: para cada insumo, qué productos lo usan y
   * cuánto. Es lo que permite editar el consumo desde el propio inventario.
   */
  const usageByIngredient = useMemo(() => {
    const map = new Map<
      string,
      { productId: string; productName: string; qty: number }[]
    >();
    for (const product of state.products) {
      for (const item of product.recipe) {
        if (item.ingredientId === "milk") continue;
        const list = map.get(item.ingredientId) ?? [];
        list.push({
          productId: product.id,
          productName: product.name,
          qty: item.qty,
        });
        map.set(item.ingredientId, list);
      }
    }
    // Las leches se consumen a través del renglón "leche elegida": el insumo
    // aparece ligado a los productos que permiten elegir leche.
    for (const milk of state.milks) {
      if (!milk.ingredientId) continue;
      const list = map.get(milk.ingredientId) ?? [];
      for (const product of state.products) {
        const milkLine = product.recipe.find((r) => r.ingredientId === "milk");
        if (!milkLine) continue;
        list.push({
          productId: product.id,
          productName: `${product.name} · si eligen ${milk.name}`,
          qty: milkLine.qty,
        });
      }
      map.set(milk.ingredientId, list);
    }
    return map;
  }, [state.products, state.milks]);

  if (state.role === "empleado") return <AccessGate module="Inventario" />;
  if (!state.flags.inventario) return <FlagGate module="Inventario" />;

  const packagingCount = state.ingredients.filter((i) => i.isPackaging).length;
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

  const submitEntry = async () => {
    if (!entry) return;
    const value = Number(entryValue);
    if (!Number.isFinite(value) || value < 0) return;

    const done =
      entry.mode === "recibir"
        ? await submit(() => receiveStock(entry.ingredient.id, value), {
            title: "Entrada registrada",
            detail: `+${unitLabel(value, entry.ingredient.unit)} de ${entry.ingredient.name}`,
          })
        : await submit(() => setStock(entry.ingredient.id, value), {
            title: "Conteo registrado",
            detail: `${entry.ingredient.name}: ${unitLabel(value, entry.ingredient.unit)}`,
          });

    if (done !== null) {
      setEntry(null);
      setEntryValue("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insumos · descuento por receta"
        title="Inventario"
        desc="Cada venta descuenta insumos según la receta del producto, incluida la leche que elige el cliente. El empaque solo se descuenta en pedidos para llevar."
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
              hint={lowStock.length ? "Por debajo del umbral" : "Nada por resurtir"}
              tone={lowStock.length ? "amber" : "neutral"}
            />
            <Stat
              label="Empaque"
              value={packagingCount}
              hint="Solo se gasta para llevar"
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
              hint="Según su umbral"
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
                const meta = LEVEL_META[stockLevel(ing)];
                const step = STEP[ing.unit];
                const pct = thresholdPct(ing);
                const uses = usageByIngredient.get(ing.id) ?? [];
                return (
                  <Card key={ing.id} className="p-4 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <div className="min-w-0 flex-1 basis-full md:basis-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-extrabold text-ink">
                            {ing.name}
                          </p>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {ing.isPackaging ? (
                            <Badge tone="neutral">Empaque</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Umbral: {unitLabel(ing.min, ing.unit)}
                          {pct !== null ? ` (${pct}% del objetivo)` : ""} · Uso
                          semanal: {unitLabel(ing.weeklyUse, ing.unit)}
                        </p>
                        {uses.length ? (
                          <button
                            type="button"
                            onClick={() => setRecipeFor(ing)}
                            className="focus-ring mt-1 rounded-full text-xs font-extrabold text-matcha-deep hover:underline"
                          >
                            Lo usan {uses.length} producto
                            {uses.length === 1 ? "" : "s"} · editar consumo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRecipeFor(ing)}
                            className="focus-ring mt-1 rounded-full text-xs font-bold text-muted hover:text-ink"
                          >
                            Ningún producto lo consume todavía
                          </button>
                        )}
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
                            setEntry({ ingredient: ing, mode: "recibir" });
                            setEntryValue("");
                          }}
                        >
                          Recibir pedido
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setEntry({ ingredient: ing, mode: "contar" });
                            setEntryValue(String(Math.round(ing.stock * 100) / 100));
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
                              isPackaging: ing.isPackaging,
                              parLevel: ing.parLevel,
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

              <Field
                label="Nivel objetivo"
                hint="Cuánto tienes cuando está bien surtido (opcional)"
              >
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={form.parLevel ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      parLevel:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <Field
              label="Umbral de alerta"
              hint="Debajo de esta cantidad el insumo se marca por resurtir"
            >
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={form.min}
                onChange={(e) => setForm({ ...form, min: Number(e.target.value) })}
              />
            </Field>

            {form.parLevel && form.parLevel > 0 ? (
              <div className="rounded-xl2 bg-cream px-4 py-3">
                <p className="text-xs font-bold text-ink">
                  Equivale al {Math.round((form.min / form.parLevel) * 100)}% del
                  nivel objetivo
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[25, 50, 75].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          min:
                            Math.round(((form.parLevel ?? 0) * pct) / 100 * 100) /
                            100,
                        })
                      }
                      className="focus-ring rounded-full border border-line bg-white px-3 py-1 text-xs font-extrabold text-ink hover:border-matcha"
                    >
                      Avisar al {pct}%
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Para insumos importados como el matcha conviene un umbral alto,
                  porque el resurtido tarda.
                </p>
              </div>
            ) : null}

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
              ) : null}
            </div>

            <label className="flex items-start justify-between gap-3 rounded-xl2 border border-line bg-paper px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">
                  Es empaque
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">
                  Vasos, tapas, servilletas, popotes. Solo se descuentan cuando el
                  pedido es para llevar.
                </span>
              </span>
              <Toggle
                checked={form.isPackaging}
                onChange={(v) => setForm({ ...form, isPackaging: v })}
                label="Es empaque"
              />
            </label>

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

      {/* ------------------------ Recibir pedido / contar ------------------------ */}
      <Modal
        open={!!entry}
        onClose={() => setEntry(null)}
        title={entry?.mode === "recibir" ? "Recibir pedido" : "Conteo físico"}
      >
        {entry ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted">
              {entry.mode === "recibir" ? (
                <>
                  Escribe cuánto llegó de <strong>{entry.ingredient.name}</strong>.
                  Se suma a la existencia actual de{" "}
                  {unitLabel(entry.ingredient.stock, entry.ingredient.unit)}.
                </>
              ) : (
                <>
                  Captura lo que hay realmente de{" "}
                  <strong>{entry.ingredient.name}</strong>. La diferencia contra el
                  sistema queda registrada como ajuste.
                </>
              )}
            </p>

            <Field
              label={
                entry.mode === "recibir"
                  ? `Cantidad recibida (${entry.ingredient.unit})`
                  : `Cantidad contada (${entry.ingredient.unit})`
              }
            >
              <Input
                autoFocus
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={entryValue}
                placeholder={entry.mode === "recibir" ? "Ej. 200" : "0"}
                onChange={(e) => setEntryValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitEntry();
                }}
                className="py-3 text-lg"
              />
            </Field>

            {entry.mode === "recibir" && Number(entryValue) > 0 ? (
              <p className="text-xs font-bold text-matcha-deep">
                Quedará en{" "}
                {unitLabel(
                  Math.round((entry.ingredient.stock + Number(entryValue)) * 100) /
                    100,
                  entry.ingredient.unit,
                )}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setEntry(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="matcha"
                className="flex-1"
                disabled={busy || entryValue.trim() === ""}
                onClick={() => void submitEntry()}
              >
                {entry.mode === "recibir" ? "Registrar entrada" : "Guardar conteo"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ------------------- Consumo por producto (desde el insumo) ------------------- */}
      <Modal
        open={!!recipeFor}
        onClose={() => setRecipeFor(null)}
        title={recipeFor ? `Consumo de ${recipeFor.name}` : ""}
        wide
      >
        {recipeFor ? (
          <IngredientUsagePanel
            ingredient={recipeFor}
            onClose={() => setRecipeFor(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

/* --------------------- Panel de consumo por producto ------------------------- */

/**
 * La vista inversa de la receta: partiendo de un insumo, cuánto gasta cada
 * producto y la posibilidad de corregirlo ahí mismo. El cliente lo pidió así
 * porque es como piensa el inventario: "¿quién se está comiendo mi leche?".
 */
function IngredientUsagePanel({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient;
  onClose: () => void;
}) {
  const { state, submit, busy } = useStore();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Productos que lo usan directamente en su receta.
  const direct = state.products
    .map((product) => {
      const line = product.recipe.find((r) => r.ingredientId === ingredient.id);
      return line ? { product, qty: line.qty } : null;
    })
    .filter((x): x is { product: (typeof state.products)[number]; qty: number } =>
      Boolean(x),
    );

  // Si el insumo es una leche, se consume por el renglón "leche elegida".
  const asMilk = state.milks.find((m) => m.ingredientId === ingredient.id);
  const viaMilk = asMilk
    ? state.products.filter((p) => p.recipe.some((r) => r.ingredientId === "milk"))
    : [];

  const available = state.products.filter(
    (p) => !p.recipe.some((r) => r.ingredientId === ingredient.id),
  );
  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState("");

  /**
   * Guarda el producto completo con la cantidad nueva para un renglón de su
   * receta. `targetId` es el insumo, o "milk" para el renglón «leche elegida».
   */
  const saveQty = async (
    product: (typeof state.products)[number],
    targetId: string,
    qty: number | null,
  ) => {
    const recipe = product.recipe
      .filter((r) => r.ingredientId !== targetId)
      .map((r) => ({ ingredientId: r.ingredientId, qty: r.qty }));
    if (qty !== null && qty > 0) {
      recipe.push({ ingredientId: targetId, qty });
    }
    return submit(
      () =>
        saveProduct({
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          desc: product.desc,
          emoji: product.emoji,
          active: product.active,
          popular: product.popular,
          mods: product.mods,
          recipe,
        }),
      {
        title: qty === null ? "Insumo quitado de la receta" : "Receta actualizada",
        detail: product.name,
      },
    );
  };

  /**
   * Un renglón editable. Es una función, no un componente, para que el campo
   * no pierda el foco mientras se escribe.
   */
  const usageRow = (
    draftKey: string,
    product: (typeof state.products)[number],
    qty: number,
    unit: string,
    onSave: (value: number) => void,
    onRemove?: () => void,
  ) => {
    const value = drafts[draftKey] ?? String(qty);
    const changed = Number(value) !== qty;
    return (
      <div
        key={draftKey}
        className="flex flex-wrap items-center gap-3 rounded-xl2 border border-line bg-paper px-4 py-3"
      >
        <span className="text-lg" aria-hidden>
          {product.emoji}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
          {product.name}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            aria-label={`Cantidad de ${ingredient.name} en ${product.name}`}
            value={value}
            onChange={(e) =>
              setDrafts((d) => ({ ...d, [draftKey]: e.target.value }))
            }
            className="w-24 text-center"
          />
          <span className="w-8 text-xs font-bold text-muted">{unit}</span>
        </span>
        <Button
          variant={changed ? "matcha" : "ghost"}
          size="sm"
          disabled={busy || !changed || !(Number(value) > 0)}
          onClick={() => onSave(Number(value))}
        >
          Guardar
        </Button>
        {onRemove ? (
          <ConfirmButton
            label="Quitar"
            confirmLabel="Sí"
            disabled={busy}
            onConfirm={onRemove}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <p className="-mt-2 text-sm leading-6 text-muted">
        Cuánto <strong>{ingredient.name}</strong> gasta cada producto al venderse.
        Lo que cambies aquí es lo que se descontará del inventario en la próxima
        venta.
      </p>

      {direct.length ? (
        <div className="space-y-2">
          {direct.map(({ product, qty }) =>
            usageRow(
              product.id,
              product,
              qty,
              ingredient.unit,
              (value) => void saveQty(product, ingredient.id, value),
              () => void saveQty(product, ingredient.id, null),
            ),
          )}
        </div>
      ) : (
        <p className="rounded-xl2 border border-dashed border-line px-4 py-6 text-center text-sm leading-6 text-muted">
          {asMilk && viaMilk.length
            ? "Ningún producto lo lleva por receta fija; se consume por la leche que elige el cliente, abajo."
            : "Ningún producto tiene este insumo en su receta todavía."}
        </p>
      )}

      {/* ------------------------- Alta desde este panel ------------------------- */}
      {available.length ? (
        <div className="border-t border-line pt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
            Agregar a la receta de otro producto
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <span className="min-w-[12rem] flex-1">
              <Select
                aria-label="Producto"
                value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)}
              >
                <option value="">Elige un producto…</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                aria-label="Cantidad"
                placeholder="Cantidad"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-28"
              />
              <span className="w-8 text-xs font-bold text-muted">
                {ingredient.unit}
              </span>
            </span>
            <Button
              variant="matcha"
              disabled={busy || !addProductId || !(Number(addQty) > 0)}
              onClick={async () => {
                const product = available.find((p) => p.id === addProductId);
                if (!product) return;
                const done = await saveQty(product, ingredient.id, Number(addQty));
                if (done) {
                  setAddProductId("");
                  setAddQty("");
                }
              }}
            >
              Agregar
            </Button>
          </div>
        </div>
      ) : null}

      {/* ------------------------- Consumo indirecto (leche) ------------------------- */}
      {asMilk && viaMilk.length ? (
        <div className="border-t border-line pt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
            También se consume como leche «{asMilk.name}»
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Estos productos llevan el renglón «leche elegida por el cliente»:
            descuentan de este insumo sólo cuando el cliente pide{" "}
            {asMilk.name.toLowerCase()}. La cantidad es la misma para cualquier
            leche que elija, así que cambiarla aquí la cambia para todas.
          </p>
          <div className="mt-2 space-y-2">
            {viaMilk.map((product) => {
              const qty =
                product.recipe.find((r) => r.ingredientId === "milk")?.qty ?? 0;
              return usageRow(
                `milk-${product.id}`,
                product,
                qty,
                "ml",
                (value) => void saveQty(product, "milk", value),
              );
            })}
          </div>
        </div>
      ) : null}

      {ingredient.isPackaging ? (
        <div className="rounded-xl2 border border-matcha/30 bg-matcha-mist px-4 py-3 text-xs leading-5 text-ink">
          Este insumo está marcado como <strong>empaque</strong>: solo se descuenta
          cuando el pedido se cobra «para llevar».
        </div>
      ) : null}

      <div className="border-t border-line pt-4">
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
