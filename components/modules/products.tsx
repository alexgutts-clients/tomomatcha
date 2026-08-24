"use client";

import { useRef, useState } from "react";
import {
  deleteExtra,
  deleteMilk,
  deleteProduct,
  saveExtra,
  saveMilk,
  saveProduct,
  setProductMod,
  setProductPrice,
  toggleExtra,
  toggleMilk,
  toggleProduct,
  removeProductImage,
  type ExtraInput,
  type MilkInput,
  type ProductInput,
} from "@/lib/actions-admin";
import { useStore } from "@/lib/store";
import { money, unitLabel } from "@/lib/format";
import {
  CATEGORY_IDS,
  CATEGORY_META,
  type CategoryId,
  type ModifierSupport,
  type Product,
} from "@/lib/types";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  ImageUpload,
  Input,
  MediaImage,
  Modal,
  PageHeader,
  Select,
  Stat,
  Textarea,
  Toggle,
  cx,
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

const EMPTY_PRODUCT: ProductInput = {
  name: "",
  category: "matcha",
  price: 0,
  desc: "",
  emoji: "🍵",
  active: true,
  popular: false,
  mods: { milk: false, sweetness: false, temperature: false, extras: false },
  recipe: [],
};

export function ProductsModule() {
  const { state, currency, submit, busy } = useStore();

  const [category, setCategory] = useState<CategoryId | "todos">("todos");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const cancelEdit = useRef(false);
  const [productForm, setProductForm] = useState<ProductInput | null>(null);
  const [milkForm, setMilkForm] = useState<MilkInput | null>(null);
  const [extraForm, setExtraForm] = useState<ExtraInput | null>(null);

  if (state.role === "empleado") return <AccessGate module="Productos" />;

  const activeProducts = state.products.filter((p) => p.active);
  const pausedCount = state.products.length - activeProducts.length;
  const avgPrice = activeProducts.length
    ? Math.round(
        activeProducts.reduce((sum, p) => sum + p.price, 0) / activeProducts.length,
      )
    : 0;

  const visible =
    category === "todos"
      ? state.products
      : state.products.filter((p) => p.category === category);

  const ingredientName = (id: string) =>
    state.ingredients.find((i) => i.id === id)?.name ?? "Insumo eliminado";
  const ingredientUnit = (id: string) =>
    state.ingredients.find((i) => i.id === id)?.unit ?? "g";

  const startEditingPrice = (p: Product) => {
    setEditingPriceId(p.id);
    setPriceDraft(String(p.price));
  };

  const commitPrice = (p: Product) => {
    if (!cancelEdit.current) {
      const value = Number(priceDraft);
      if (
        priceDraft.trim() !== "" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value !== p.price
      ) {
        void submit(() => setProductPrice(p.id, value), {
          title: "Precio actualizado",
          detail: `${p.name}: ${money(value, currency)}`,
        });
      }
    }
    cancelEdit.current = false;
    setEditingPriceId(null);
  };

  const editProduct = (p: Product) => {
    setProductForm({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      desc: p.desc,
      emoji: p.emoji,
      active: p.active,
      popular: p.popular,
      mods: { ...p.mods },
      recipe: p.recipe.map((r) => ({ ingredientId: r.ingredientId, qty: r.qty })),
    });
  };

  const submitProduct = async () => {
    if (!productForm) return;
    const saved = await submit(() => saveProduct(productForm), {
      title: productForm.id ? "Producto actualizado" : "Producto creado",
      detail: productForm.name,
    });
    if (saved) setProductForm(null);
  };

  const submitMilk = async () => {
    if (!milkForm) return;
    const saved = await submit(() => saveMilk(milkForm), {
      title: milkForm.id ? "Leche actualizada" : "Leche agregada",
      detail: milkForm.name,
    });
    if (saved) setMilkForm(null);
  };

  const submitExtra = async () => {
    if (!extraForm) return;
    const saved = await submit(() => saveExtra(extraForm), {
      title: extraForm.id ? "Extra actualizado" : "Extra agregado",
      detail: extraForm.name,
    });
    if (saved) setExtraForm(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Menú · sin tocar código"
        title="Productos"
        desc="El menú vive aquí: crea productos, cambia precios, define recetas y decide qué se puede personalizar. Sin depender de un desarrollador."
        actions={
          <Button
            variant="matcha"
            onClick={() => setProductForm({ ...EMPTY_PRODUCT, recipe: [] })}
          >
            + Nuevo producto
          </Button>
        }
      />

      {state.products.length === 0 ? (
        <EmptyState
          emoji="🍵"
          title="La carta está vacía"
          desc="Crea tu primer producto, o carga el catálogo sugerido de TomoMatcha desde Ajustes y ajústalo a tu gusto."
          action={
            <Button
              variant="matcha"
              onClick={() => setProductForm({ ...EMPTY_PRODUCT, recipe: [] })}
            >
              Crear el primero
            </Button>
          }
        />
      ) : (
        <>
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
            <Stat
              label="Categorías"
              value={CATEGORY_IDS.length}
              hint="Matcha, café, té y bakery"
            />
            <Stat
              label="Precio promedio"
              value={money(avgPrice, currency)}
              hint="Solo productos activos"
            />
          </div>

          {/* ---------------------------- Filtro por categoría --------------------------- */}
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
            {CATEGORY_IDS.map((id) => (
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
                <span aria-hidden>{CATEGORY_META[id].emoji}</span>
                {CATEGORY_META[id].label}
              </button>
            ))}
          </div>

          {/* -------------------------------- Lista -------------------------------- */}
          <div className="space-y-2.5">
            {visible.map((p) => {
              const isOpen = !!expanded[p.id];
              return (
                <Card key={p.id} className={cx("transition", !p.active && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl2 bg-matcha-mist text-2xl">
                      <MediaImage
                        objectKey={p.imageKey}
                        alt=""
                        className="h-full w-full object-cover"
                        fallback={<span aria-hidden>{p.emoji}</span>}
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-ink">{p.name}</p>
                        <Badge tone="neutral">
                          {CATEGORY_META[p.category].label}
                        </Badge>
                        {p.popular ? <Badge tone="matcha">Popular</Badge> : null}
                        {!p.active ? (
                          <Badge tone="danger">Fuera del menú</Badge>
                        ) : null}
                        {p.recipe.length === 0 && state.flags.inventario ? (
                          <Badge tone="amber">Sin receta</Badge>
                        ) : null}
                      </div>
                      {p.desc ? (
                        <p className="mt-0.5 text-xs text-muted">{p.desc}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {editingPriceId === p.id ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          autoFocus
                          aria-label={`Nuevo precio de ${p.name}`}
                          value={priceDraft}
                          onChange={(e) => setPriceDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") {
                              cancelEdit.current = true;
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={() => commitPrice(p)}
                          className="focus-ring w-24 rounded-full border border-matcha bg-white px-3 py-1.5 text-center text-sm font-extrabold text-ink"
                        />
                      ) : (
                        <button
                          type="button"
                          aria-label={`Editar precio de ${p.name}`}
                          onClick={() => startEditingPrice(p)}
                          className="focus-ring rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-extrabold text-ink transition hover:border-matcha hover:text-matcha-deep"
                        >
                          {money(p.price, currency)}
                        </button>
                      )}
                      <Toggle
                        checked={p.active}
                        disabled={busy}
                        onChange={() =>
                          void submit(() => toggleProduct(p.id), { silent: true })
                        }
                        label={`${p.name} disponible en el menú`}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`receta-${p.id}`}
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))
                      }
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full text-xs font-extrabold text-matcha-deep hover:underline"
                    >
                      Receta y opciones
                      <span
                        aria-hidden
                        className={cx(
                          "inline-block transition-transform",
                          isOpen && "rotate-180",
                        )}
                      >
                        ▾
                      </span>
                    </button>
                    <span className="text-line" aria-hidden>
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() => editProduct(p)}
                      className="focus-ring rounded-full text-xs font-extrabold text-muted hover:text-ink"
                    >
                      Editar producto
                    </button>
                  </div>

                  {isOpen ? (
                    <div
                      id={`receta-${p.id}`}
                      className="animate-rise mt-3 grid gap-5 border-t border-line pt-4 md:grid-cols-2"
                    >
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                          Receta
                        </p>
                        {p.recipe.length ? (
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {p.recipe.map((r, idx) => (
                              <li
                                key={`${p.id}-${r.ingredientId}-${idx}`}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="min-w-0 truncate font-bold text-ink">
                                  {r.ingredientId === "milk"
                                    ? "Leche elegida por el cliente"
                                    : ingredientName(r.ingredientId)}
                                </span>
                                <span className="shrink-0 text-xs font-extrabold text-muted">
                                  {unitLabel(
                                    r.qty,
                                    r.ingredientId === "milk"
                                      ? "ml"
                                      : ingredientUnit(r.ingredientId),
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-muted">
                            Sin receta: este producto no descuenta inventario al
                            venderse. Edítalo para agregarle insumos.
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                          <ImageUpload
                            target={{ purpose: "producto", productId: p.id }}
                            label={p.imageKey ? "Cambiar foto" : "Subir foto"}
                            compact
                          />
                          {p.imageKey ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                void submit(() => removeProductImage(p.id), {
                                  title: "Foto quitada",
                                })
                              }
                            >
                              Quitar foto
                            </Button>
                          ) : null}
                        </div>
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
                                disabled={busy}
                                onChange={(value) =>
                                  void submit(
                                    () => setProductMod(p.id, mod, value),
                                    { silent: true },
                                  )
                                }
                                label={`Permitir ${MOD_LABELS[mod].toLowerCase()} en ${p.name}`}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 border-t border-line pt-3">
                          <ConfirmButton
                            label="Eliminar producto"
                            confirmLabel="Sí, eliminar"
                            disabled={busy}
                            onConfirm={() =>
                              void submit(() => deleteProduct(p.id), {
                                title: "Producto eliminado",
                                detail: p.name,
                              })
                            }
                          />
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
        </>
      )}

      {/* --------------------- Opciones globales de personalización --------------------- */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Opciones globales</p>
            <h2 className="display mt-1 text-xl text-ink">
              Leches y extras de toda la carta
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-5 text-muted">
              Lo que enciendas aquí aparece como opción en cada bebida que lo
              permita, y descuenta el insumo que le asocies.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                Leches
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setMilkForm({
                    name: "",
                    surcharge: 0,
                    ingredientId: null,
                    available: true,
                  })
                }
              >
                + Agregar
              </Button>
            </div>
            <ul className="mt-3 space-y-2.5">
              {state.milks.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                      {m.name}
                      {m.surcharge > 0 ? (
                        <span className="text-xs font-extrabold text-matcha-deep">
                          +{money(m.surcharge, currency)}
                        </span>
                      ) : null}
                      {!m.available ? <Badge tone="danger">Apagada</Badge> : null}
                    </p>
                    <p className="text-[11px] text-muted">
                      {m.ingredientId
                        ? `Descuenta: ${ingredientName(m.ingredientId)}`
                        : "No descuenta inventario"}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMilkForm({
                            id: m.id,
                            name: m.name,
                            surcharge: m.surcharge,
                            ingredientId: m.ingredientId,
                            available: m.available,
                          })
                        }
                        className="focus-ring rounded-full text-[11px] font-extrabold text-muted hover:text-ink"
                      >
                        Editar
                      </button>
                      <ConfirmButton
                        label="Eliminar"
                        confirmLabel="Sí"
                        disabled={busy}
                        onConfirm={() =>
                          void submit(() => deleteMilk(m.id), {
                            title: "Leche eliminada",
                            detail: m.name,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Toggle
                    checked={m.available}
                    disabled={busy}
                    onChange={() =>
                      void submit(() => toggleMilk(m.id), { silent: true })
                    }
                    label={`Leche ${m.name} disponible en el menú`}
                  />
                </li>
              ))}
              {!state.milks.length ? (
                <li className="text-xs leading-5 text-muted">
                  Sin leches registradas: las bebidas con opción de leche no
                  mostrarán alternativas.
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                Extras
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExtraForm({
                    name: "",
                    price: 0,
                    available: true,
                    recipe: [],
                  })
                }
              >
                + Agregar
              </Button>
            </div>
            <ul className="mt-3 space-y-2.5">
              {state.extras.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                      {e.name}
                      <span className="text-xs font-extrabold text-matcha-deep">
                        +{money(e.price, currency)}
                      </span>
                      {!e.available ? <Badge tone="danger">Apagado</Badge> : null}
                    </p>
                    <p className="text-[11px] text-muted">
                      {e.recipe.length
                        ? `Descuenta: ${e.recipe
                            .map((r) => ingredientName(r.ingredientId))
                            .join(", ")}`
                        : "Sin receta asociada"}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExtraForm({
                            id: e.id,
                            name: e.name,
                            price: e.price,
                            available: e.available,
                            recipe: e.recipe.map((r) => ({
                              ingredientId: r.ingredientId,
                              qty: r.qty,
                            })),
                          })
                        }
                        className="focus-ring rounded-full text-[11px] font-extrabold text-muted hover:text-ink"
                      >
                        Editar
                      </button>
                      <ConfirmButton
                        label="Eliminar"
                        confirmLabel="Sí"
                        disabled={busy}
                        onConfirm={() =>
                          void submit(() => deleteExtra(e.id), {
                            title: "Extra eliminado",
                            detail: e.name,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Toggle
                    checked={e.available}
                    disabled={busy}
                    onChange={() =>
                      void submit(() => toggleExtra(e.id), { silent: true })
                    }
                    label={`Extra ${e.name} disponible en el menú`}
                  />
                </li>
              ))}
              {!state.extras.length ? (
                <li className="text-xs leading-5 text-muted">
                  Sin extras registrados.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </Card>

      {/* ---------------------------- Modal de producto ---------------------------- */}
      <Modal
        open={!!productForm}
        onClose={() => setProductForm(null)}
        title={productForm?.id ? "Editar producto" : "Nuevo producto"}
        wide
      >
        {productForm ? (
          <ProductForm
            value={productForm}
            onChange={setProductForm}
            ingredients={state.ingredients}
            currency={currency}
            busy={busy}
            onCancel={() => setProductForm(null)}
            onSave={() => void submitProduct()}
          />
        ) : null}
      </Modal>

      {/* ------------------------------ Modal de leche ----------------------------- */}
      <Modal
        open={!!milkForm}
        onClose={() => setMilkForm(null)}
        title={milkForm?.id ? "Editar leche" : "Nueva leche"}
      >
        {milkForm ? (
          <div className="space-y-4">
            <Field label="Nombre">
              <Input
                autoFocus
                value={milkForm.name}
                maxLength={80}
                onChange={(e) => setMilkForm({ ...milkForm, name: e.target.value })}
                placeholder="Ej. Avena"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cargo extra" hint="0 si no cuesta más">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={milkForm.surcharge}
                  onChange={(e) =>
                    setMilkForm({ ...milkForm, surcharge: Number(e.target.value) })
                  }
                />
              </Field>
              <Field
                label="Insumo que descuenta"
                hint="Déjalo vacío si se prepara en agua"
              >
                <Select
                  value={milkForm.ingredientId ?? ""}
                  onChange={(e) =>
                    setMilkForm({
                      ...milkForm,
                      ingredientId: e.target.value || null,
                    })
                  }
                >
                  <option value="">No descuenta inventario</option>
                  {state.ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setMilkForm(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="matcha"
                className="flex-1"
                disabled={busy || !milkForm.name.trim()}
                onClick={() => void submitMilk()}
              >
                Guardar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ------------------------------ Modal de extra ----------------------------- */}
      <Modal
        open={!!extraForm}
        onClose={() => setExtraForm(null)}
        title={extraForm?.id ? "Editar extra" : "Nuevo extra"}
      >
        {extraForm ? (
          <div className="space-y-4">
            <Field label="Nombre">
              <Input
                autoFocus
                value={extraForm.name}
                maxLength={80}
                onChange={(e) =>
                  setExtraForm({ ...extraForm, name: e.target.value })
                }
                placeholder="Ej. Shot extra de espresso"
              />
            </Field>
            <Field label="Precio">
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={extraForm.price}
                onChange={(e) =>
                  setExtraForm({ ...extraForm, price: Number(e.target.value) })
                }
              />
            </Field>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                Insumos que descuenta
              </p>
              <div className="mt-2 space-y-2">
                {extraForm.recipe.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      aria-label="Insumo"
                      value={row.ingredientId}
                      onChange={(e) => {
                        const recipe = [...extraForm.recipe];
                        recipe[idx] = { ...row, ingredientId: e.target.value };
                        setExtraForm({ ...extraForm, recipe });
                      }}
                    >
                      {state.ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      aria-label="Cantidad"
                      value={row.qty}
                      onChange={(e) => {
                        const recipe = [...extraForm.recipe];
                        recipe[idx] = { ...row, qty: Number(e.target.value) };
                        setExtraForm({ ...extraForm, recipe });
                      }}
                      className="w-24 shrink-0"
                    />
                    <button
                      type="button"
                      aria-label="Quitar insumo"
                      onClick={() =>
                        setExtraForm({
                          ...extraForm,
                          recipe: extraForm.recipe.filter((_, i) => i !== idx),
                        })
                      }
                      className="focus-ring shrink-0 rounded-full p-2 text-muted hover:bg-cream hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {state.ingredients.length ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExtraForm({
                        ...extraForm,
                        recipe: [
                          ...extraForm.recipe,
                          { ingredientId: state.ingredients[0].id, qty: 1 },
                        ],
                      })
                    }
                  >
                    + Agregar insumo
                  </Button>
                ) : (
                  <p className="text-xs text-muted">
                    Registra insumos en Inventario para poder asociarlos.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setExtraForm(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="matcha"
                className="flex-1"
                disabled={busy || !extraForm.name.trim()}
                onClick={() => void submitExtra()}
              >
                Guardar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/* --------------------------- Formulario de producto --------------------------- */

function ProductForm({
  value,
  onChange,
  ingredients,
  currency,
  busy,
  onCancel,
  onSave,
}: {
  value: ProductInput;
  onChange: (next: ProductInput) => void;
  ingredients: { id: string; name: string; unit: string }[];
  currency: string;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const hasMilkLine = value.recipe.some((r) => r.ingredientId === "milk");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Nombre">
          <Input
            autoFocus
            value={value.name}
            maxLength={120}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Ej. Matcha Latte"
          />
        </Field>
        <Field label="Emoji" hint="Se usa si no hay foto">
          <Input
            value={value.emoji ?? ""}
            maxLength={8}
            onChange={(e) => onChange({ ...value, emoji: e.target.value })}
            className="w-20 text-center text-lg"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría">
          <Select
            value={value.category}
            onChange={(e) =>
              onChange({ ...value, category: e.target.value as CategoryId })
            }
          >
            {CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {CATEGORY_META[id].emoji} {CATEGORY_META[id].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Precio (${currency})`}>
          <Input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={value.price}
            onChange={(e) => onChange({ ...value, price: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Descripción" hint="Aparece en el punto de venta">
        <Textarea
          rows={2}
          maxLength={300}
          value={value.desc ?? ""}
          onChange={(e) => onChange({ ...value, desc: e.target.value })}
          placeholder="Matcha grado latte batido con leche cremosa."
        />
      </Field>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-xl2 border border-line bg-paper px-4 py-2.5">
          <span className="text-xs font-bold text-ink">Activo en el menú</span>
          <Toggle
            checked={value.active}
            onChange={(v) => onChange({ ...value, active: v })}
            label="Activo en el menú"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl2 border border-line bg-paper px-4 py-2.5">
          <span className="text-xs font-bold text-ink">Marcar como popular</span>
          <Toggle
            checked={value.popular}
            onChange={(v) => onChange({ ...value, popular: v })}
            label="Marcar como popular"
          />
        </label>
      </div>

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
          Personalización permitida
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {MOD_KEYS.map((mod) => (
            <label
              key={mod}
              className="flex items-center justify-between gap-2 rounded-xl2 border border-line bg-paper px-3 py-2"
            >
              <span className="text-xs font-bold text-ink">{MOD_LABELS[mod]}</span>
              <Toggle
                checked={value.mods[mod]}
                disabled={mod === "milk" && hasMilkLine}
                onChange={(v) =>
                  onChange({ ...value, mods: { ...value.mods, [mod]: v } })
                }
                label={MOD_LABELS[mod]}
              />
            </label>
          ))}
        </div>
        {hasMilkLine ? (
          <p className="mt-2 text-xs leading-5 text-muted">
            La receta usa «leche elegida», así que la opción de leche queda
            encendida.
          </p>
        ) : null}
      </div>

      {/* --------------------------------- Receta --------------------------------- */}
      <div className="border-t border-line pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
          Receta · lo que descuenta cada venta
        </p>
        <div className="mt-2 space-y-2">
          {value.recipe.map((row, idx) => {
            const unit =
              row.ingredientId === "milk"
                ? "ml"
                : (ingredients.find((i) => i.id === row.ingredientId)?.unit ?? "g");
            return (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  aria-label="Insumo de la receta"
                  value={row.ingredientId}
                  onChange={(e) => {
                    const recipe = [...value.recipe];
                    recipe[idx] = { ...row, ingredientId: e.target.value };
                    const usesMilk = recipe.some((r) => r.ingredientId === "milk");
                    onChange({
                      ...value,
                      recipe,
                      mods: usesMilk
                        ? { ...value.mods, milk: true }
                        : value.mods,
                    });
                  }}
                >
                  <option value="milk">Leche elegida por el cliente</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </Select>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    aria-label="Cantidad"
                    value={row.qty}
                    onChange={(e) => {
                      const recipe = [...value.recipe];
                      recipe[idx] = { ...row, qty: Number(e.target.value) };
                      onChange({ ...value, recipe });
                    }}
                    className="w-24"
                  />
                  <span className="w-8 text-xs font-bold text-muted">{unit}</span>
                </span>
                <button
                  type="button"
                  aria-label="Quitar renglón"
                  onClick={() => {
                    const recipe = value.recipe.filter((_, i) => i !== idx);
                    onChange({ ...value, recipe });
                  }}
                  className="focus-ring shrink-0 rounded-full p-2 text-muted hover:bg-cream hover:text-danger"
                >
                  ✕
                </button>
              </div>
            );
          })}

          {ingredients.length || !hasMilkLine ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextId = !hasMilkLine
                  ? "milk"
                  : (ingredients.find(
                      (i) => !value.recipe.some((r) => r.ingredientId === i.id),
                    )?.id ?? ingredients[0]?.id);
                if (!nextId) return;
                onChange({
                  ...value,
                  recipe: [...value.recipe, { ingredientId: nextId, qty: 1 }],
                  mods:
                    nextId === "milk"
                      ? { ...value.mods, milk: true }
                      : value.mods,
                });
              }}
            >
              + Agregar renglón
            </Button>
          ) : null}

          {!ingredients.length ? (
            <p className="text-xs leading-5 text-muted">
              Registra insumos en Inventario para poder armar recetas. Sin receta,
              el producto se vende pero no descuenta nada.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 border-t border-line pt-4">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="matcha"
          className="flex-1"
          disabled={busy || !value.name.trim()}
          onClick={onSave}
        >
          {value.id ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </div>
  );
}
