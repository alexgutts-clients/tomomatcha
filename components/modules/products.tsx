"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { money, unitLabel } from "@/lib/format";
import {
  CATEGORY_META,
  CategoryId,
  ModifierSupport,
  Product,
} from "@/lib/types";
import {
  AccessGate,
  Badge,
  Card,
  cx,
  DemoTag,
  PageHeader,
  Stat,
  Toggle,
} from "@/components/ui";

const MOD_KEYS: (keyof ModifierSupport)[] = [
  "milk",
  "sweetness",
  "temperature",
  "extras",
];

const MOD_LABELS: Record<keyof ModifierSupport, string> = {
  milk: "Leche",
  sweetness: "Dulzor",
  temperature: "Temperatura",
  extras: "Extras",
};

export function ProductsModule() {
  const {
    state,
    toggleProduct,
    setProductPrice,
    setProductMod,
    toggleMilk,
    toggleExtra,
  } = useStore();

  const [category, setCategory] = useState<CategoryId | "todos">("todos");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const cancelEdit = useRef(false);

  if (state.role === "empleado") return <AccessGate module="Productos" />;

  const activeProducts = state.products.filter((p) => p.active);
  const pausedCount = state.products.length - activeProducts.length;
  const avgPrice = activeProducts.length
    ? Math.round(
        activeProducts.reduce((sum, p) => sum + p.price, 0) / activeProducts.length,
      )
    : 0;

  const categories = Object.entries(CATEGORY_META) as [
    CategoryId,
    { label: string; emoji: string },
  ][];

  const visible =
    category === "todos"
      ? state.products
      : state.products.filter((p) => p.category === category);

  const startEditing = (p: Product) => {
    setEditingId(p.id);
    setDraft(String(p.price));
  };

  const commitPrice = (p: Product) => {
    if (!cancelEdit.current) {
      const value = Number(draft);
      if (draft.trim() !== "" && Number.isFinite(value) && value >= 0) {
        setProductPrice(p.id, value);
      }
    }
    cancelEdit.current = false;
    setEditingId(null);
  };

  const ingredientName = (id: string) =>
    state.ingredients.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Menú · sin tocar código"
        title="Productos"
        desc="El menú vive aquí, no en el código: cambia precios, pausa bebidas y decide qué se personaliza, tal como lo haría una gran cadena, sin llamar a un desarrollador."
        actions={<DemoTag />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="En el menú"
          value={activeProducts.length}
          hint="Visibles en el punto de venta"
          tone="matcha"
        />
        <Stat
          label="Pausados"
          value={pausedCount}
          hint={pausedCount ? "Ocultos temporalmente" : "Todo el menú activo"}
          tone={pausedCount ? "amber" : "neutral"}
        />
        <Stat label="Categorías" value={categories.length} hint="Matcha, café, té y bakery" />
        <Stat
          label="Precio promedio"
          value={money(avgPrice)}
          hint="Solo productos activos"
        />
      </div>

      {/* ---------------------------- Filtro por categoría ---------------------------- */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={category === "todos"}
          onClick={() => setCategory("todos")}
          className={cx(
            "focus-ring rounded-full px-4 py-2 text-xs font-extrabold transition",
            category === "todos"
              ? "bg-ink text-paper"
              : "border border-line bg-white text-muted hover:border-matcha hover:text-matcha-deep",
          )}
        >
          Todos
        </button>
        {categories.map(([id, meta]) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
            className={cx(
              "focus-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition",
              category === id
                ? "bg-ink text-paper"
                : "border border-line bg-white text-muted hover:border-matcha hover:text-matcha-deep",
            )}
          >
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}
          </button>
        ))}
      </div>

      {/* -------------------------------- Lista de productos -------------------------------- */}
      <div className="space-y-2.5">
        {visible.map((p) => {
          const isOpen = !!expanded[p.id];
          return (
            <Card key={p.id} className={cx("transition", !p.active && "opacity-60")}>
              <div className="flex items-start gap-3">
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl2 bg-matcha-mist text-2xl"
                  aria-hidden
                >
                  {p.emoji}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-ink">{p.name}</p>
                    <Badge tone="neutral">{CATEGORY_META[p.category].label}</Badge>
                    {p.popular ? <Badge tone="matcha">Popular</Badge> : null}
                    {!p.active ? <Badge tone="danger">Fuera del menú</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{p.desc}</p>
                  {!p.active ? (
                    <p className="mt-1 text-xs font-bold text-danger">
                      No aparece en el punto de venta.
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {editingId === p.id ? (
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      autoFocus
                      aria-label={`Nuevo precio de ${p.name}`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          cancelEdit.current = true;
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={() => commitPrice(p)}
                      className="focus-ring w-20 rounded-full border border-matcha bg-white px-3 py-1.5 text-center text-sm font-extrabold text-ink"
                    />
                  ) : (
                    <button
                      type="button"
                      aria-label={`Editar precio de ${p.name}`}
                      onClick={() => startEditing(p)}
                      className="focus-ring rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-extrabold text-ink transition hover:border-matcha hover:text-matcha-deep"
                    >
                      {money(p.price)}
                    </button>
                  )}
                  <Toggle
                    checked={p.active}
                    onChange={() => toggleProduct(p.id)}
                    label={`${p.name} disponible en el menú`}
                  />
                </div>
              </div>

              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`receta-${p.id}`}
                onClick={() => setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))}
                className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-full text-xs font-extrabold text-matcha-deep hover:underline"
              >
                Receta y opciones
                <span
                  aria-hidden
                  className={cx("inline-block transition-transform", isOpen && "rotate-180")}
                >
                  ▾
                </span>
              </button>

              {isOpen ? (
                <div
                  id={`receta-${p.id}`}
                  className="animate-rise mt-3 grid gap-5 border-t border-line pt-4 md:grid-cols-2"
                >
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                      Receta
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {p.recipe.map((r, idx) => (
                        <li
                          key={`${p.id}-${r.ingredientId}-${idx}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="font-bold text-ink">
                            {r.ingredientId === "milk"
                              ? "Leche elegida por el cliente"
                              : ingredientName(r.ingredientId)}
                          </span>
                          <span className="shrink-0 text-xs font-extrabold text-muted">
                            {unitLabel(
                              r.qty,
                              r.ingredientId === "milk"
                                ? "ml"
                                : state.ingredients.find((i) => i.id === r.ingredientId)
                                    ?.unit ?? "g",
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                      Personalización
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {MOD_KEYS.map((mod) => (
                        <div
                          key={mod}
                          className="flex items-center justify-between gap-2 rounded-xl2 border border-line bg-paper px-3 py-2"
                        >
                          <span className="text-xs font-bold text-ink">
                            {MOD_LABELS[mod]}
                          </span>
                          <Toggle
                            checked={p.mods[mod]}
                            onChange={(value) => setProductMod(p.id, mod, value)}
                            label={`Permitir ${MOD_LABELS[mod].toLowerCase()} en ${p.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
        {!visible.length ? (
          <p className="rounded-xl2 border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            No hay productos en esta categoría todavía.
          </p>
        ) : null}
      </div>

      {/* --------------------- Opciones globales de personalización --------------------- */}
      <Card>
        <p className="eyebrow">Opciones globales de personalización</p>
        <h2 className="display mt-1 text-xl text-ink">Leches y extras de toda la carta</h2>
        <p className="mt-1 text-xs text-muted">
          Lo que enciendas aquí aparece como opción en cada bebida que lo permita.
        </p>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Leches
            </p>
            <ul className="mt-3 space-y-2.5">
              {state.milks.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                      {m.name}
                      {m.surcharge > 0 ? (
                        <span className="text-xs font-extrabold text-matcha-deep">
                          +{money(m.surcharge)}
                        </span>
                      ) : null}
                      {!m.available ? <Badge tone="danger">Apagada</Badge> : null}
                    </p>
                    <p className="text-[11px] text-muted">
                      {m.ingredientId
                        ? `Descuenta: ${ingredientName(m.ingredientId)}`
                        : "Se prepara en agua, no descuenta inventario"}
                    </p>
                  </div>
                  <Toggle
                    checked={m.available}
                    onChange={() => toggleMilk(m.id)}
                    label={`Leche ${m.name} disponible en el menú`}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Las leches apagadas desaparecen del punto de venta.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Extras
            </p>
            <ul className="mt-3 space-y-2.5">
              {state.extras.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                      {e.name}
                      <span className="text-xs font-extrabold text-matcha-deep">
                        +{money(e.price)}
                      </span>
                      {!e.available ? <Badge tone="danger">Apagado</Badge> : null}
                    </p>
                    <p className="text-[11px] text-muted">
                      {e.recipe[0]
                        ? `Descuenta: ${
                            e.recipe[0].ingredientId === "milk"
                              ? "Leche elegida por el cliente"
                              : ingredientName(e.recipe[0].ingredientId)
                          }`
                        : "Sin receta asociada"}
                    </p>
                  </div>
                  <Toggle
                    checked={e.available}
                    onChange={() => toggleExtra(e.id)}
                    label={`Extra ${e.name} disponible en el menú`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">
          Esta pantalla resume la idea del proyecto: el equipo del café ajusta menú,
          precios y opciones por su cuenta, en el momento, sin depender de un
          programador. Todos los cambios son locales y de demostración.
        </p>
      </Card>
    </div>
  );
}
