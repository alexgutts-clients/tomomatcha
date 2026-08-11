"use client";

import Link from "next/link";
import { ReactNode, useRef, useState } from "react";
import { useDerived, useStore } from "@/lib/store";
import { money } from "@/lib/format";
import {
  CartLine,
  CATEGORY_META,
  CategoryId,
  LineModifiers,
  Order,
  PAYMENT_META,
  PaymentMethod,
  pointsFor,
  Product,
  Sweetness,
  SWEETNESS_STEPS,
  Temperature,
} from "@/lib/types";
import { Badge, Button, Card, cx, DemoTag, Modal, PageHeader } from "@/components/ui";

const CATEGORY_IDS = Object.keys(CATEGORY_META) as CategoryId[];

const PROMOS: { pct: number; label: string }[] = [
  { pct: 0, label: "Sin promo" },
  { pct: 10, label: "Matcha lovers −10%" },
  { pct: 15, label: "Cliente frecuente −15%" },
];

const TEMP_LABEL: Record<Temperature, string> = {
  caliente: "Caliente",
  frio: "Frío",
};

const TEMP_EMOJI: Record<Temperature, string> = {
  caliente: "🔥",
  frio: "🧊",
};

function sweetnessLabel(s: Sweetness): string {
  return s === 0 ? "Sin azúcar" : `${s}%`;
}

/** Borrador de renglón mientras se personaliza en el modal. */
interface DraftLine {
  /** key del renglón que se edita; null cuando es un renglón nuevo */
  lineKey: string | null;
  productId: string;
  qty: number;
  milkId?: string;
  sweetness?: Sweetness;
  temperature?: Temperature;
  extraIds: string[];
  notes: string;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "focus-ring rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
        active
          ? "border-matcha bg-matcha-mist text-matcha-deep"
          : "border-line bg-white text-ink hover:border-matcha",
      )}
    >
      {active ? "✓ " : ""}
      {children}
    </button>
  );
}

export function PosModule() {
  const { state, checkout, notify } = useStore();
  const { cashClosedToday } = useDerived();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryId | "todos">("todos");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [draft, setDraft] = useState<DraftLine | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [cashReceived, setCashReceived] = useState("");
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false);
  const [success, setSuccess] = useState<Order | null>(null);
  const lineCounter = useRef(0);

  /* ------------------------------ Catálogo -------------------------------- */

  const term = search.trim().toLowerCase();
  const visibleProducts = state.products.filter(
    (p) =>
      p.active &&
      (category === "todos" || p.category === category) &&
      (!term ||
        p.name.toLowerCase().includes(term) ||
        p.desc.toLowerCase().includes(term)),
  );

  /* ---------------------------- Precios de línea --------------------------- */

  const lineUnitPrice = (line: CartLine): number => {
    const product = state.products.find((p) => p.id === line.productId);
    if (!product) return 0;
    const milkSurcharge =
      state.milks.find((m) => m.id === line.modifiers.milkId)?.surcharge ?? 0;
    const extrasSum = line.modifiers.extraIds.reduce(
      (sum, id) => sum + (state.extras.find((e) => e.id === id)?.price ?? 0),
      0,
    );
    return product.price + milkSurcharge + extrasSum;
  };

  const summaryFor = (line: CartLine): string => {
    const parts: string[] = [];
    const m = line.modifiers;
    if (m.milkId) {
      const milk = state.milks.find((mi) => mi.id === m.milkId);
      if (milk) parts.push(`Leche: ${milk.name}`);
    }
    if (m.sweetness !== undefined) {
      parts.push(m.sweetness === 0 ? "Sin azúcar" : `${m.sweetness}% dulzor`);
    }
    if (m.temperature) parts.push(TEMP_LABEL[m.temperature]);
    for (const id of m.extraIds) {
      const extra = state.extras.find((e) => e.id === id);
      if (extra) parts.push(extra.name);
    }
    return parts.join(" · ");
  };

  const subtotal = cart.reduce((sum, l) => sum + lineUnitPrice(l) * l.qty, 0);
  const total = Math.round(subtotal * (1 - discountPct / 100));
  const discountAmount = subtotal - total;
  const itemCount = cart.reduce((n, l) => n + l.qty, 0);
  const activePromo = PROMOS.find((p) => p.pct === discountPct);
  const selectedCustomer = state.customers.find((c) => c.id === customerId);

  // Si Mercado Pago se apaga desde Ajustes, nunca dejamos ese método activo.
  const activePayment: PaymentMethod =
    payment === "mercadopago" && !state.flags.mercadoPago ? "efectivo" : payment;
  const received = Number(cashReceived) || 0;
  const cashOk = activePayment !== "efectivo" || received >= total;

  const paymentOptions: { id: PaymentMethod; emoji: string }[] = [
    { id: "efectivo", emoji: "💵" },
    { id: "tarjeta", emoji: "💳" },
    ...(state.flags.mercadoPago
      ? [{ id: "mercadopago" as PaymentMethod, emoji: "📱" }]
      : []),
  ];

  /* ------------------------- Borrador (modal de línea) ---------------------- */

  const openProduct = (product: Product) => {
    const availableMilks = state.milks.filter((m) => m.available);
    const defaultMilk =
      availableMilks.find((m) => m.id === "entera") ?? availableMilks[0];
    setDraft({
      lineKey: null,
      productId: product.id,
      qty: 1,
      milkId: product.mods.milk ? defaultMilk?.id : undefined,
      sweetness: product.mods.sweetness ? 50 : undefined,
      temperature: product.mods.temperature ? "caliente" : undefined,
      extraIds: [],
      notes: "",
    });
  };

  const openLine = (line: CartLine) => {
    setDraft({
      lineKey: line.key,
      productId: line.productId,
      qty: line.qty,
      milkId: line.modifiers.milkId,
      sweetness: line.modifiers.sweetness,
      temperature: line.modifiers.temperature,
      extraIds: [...line.modifiers.extraIds],
      notes: line.modifiers.notes ?? "",
    });
  };

  const confirmDraft = () => {
    if (!draft) return;
    const notes = draft.notes.trim();
    const modifiers: LineModifiers = {
      milkId: draft.milkId,
      sweetness: draft.sweetness,
      temperature: draft.temperature,
      extraIds: [...draft.extraIds],
      notes: notes ? notes : undefined,
    };
    if (draft.lineKey) {
      setCart((c) =>
        c.map((l) =>
          l.key === draft.lineKey ? { ...l, qty: draft.qty, modifiers } : l,
        ),
      );
    } else {
      const key = `linea-${++lineCounter.current}`;
      setCart((c) => [
        ...c,
        { key, productId: draft.productId, qty: draft.qty, modifiers },
      ]);
    }
    setDraft(null);
  };

  const removeLine = (key: string) => {
    setCart((c) => c.filter((l) => l.key !== key));
  };

  const draftProduct = draft
    ? state.products.find((p) => p.id === draft.productId)
    : undefined;
  let draftUnit = 0;
  if (draft && draftProduct) {
    const milkSurcharge =
      state.milks.find((m) => m.id === draft.milkId)?.surcharge ?? 0;
    const extrasSum = draft.extraIds.reduce(
      (sum, id) => sum + (state.extras.find((e) => e.id === id)?.price ?? 0),
      0,
    );
    draftUnit = draftProduct.price + milkSurcharge + extrasSum;
  }

  /* --------------------------------- Cobro --------------------------------- */

  const canCharge = cart.length > 0 && !cashClosedToday && cashOk;

  const handleCheckout = () => {
    if (!canCharge) return;
    const order = checkout({
      lines: cart,
      discountPct,
      discountLabel: discountPct > 0 ? activePromo?.label : undefined,
      payment: activePayment,
      customerId: state.flags.lealtad && customerId ? customerId : undefined,
    });
    if (!order) return;
    notify(
      "Venta registrada (demo)",
      `Ticket #${order.folio} · ${money(order.total)} · ${PAYMENT_META[order.payment].short}`,
    );
    setCart([]);
    setDiscountPct(0);
    setCustomerId("");
    setPayment("efectivo");
    setCashReceived("");
    setMobileTicketOpen(false);
    setSuccess(order);
  };

  /* ----------------------------- Cuerpo del ticket -------------------------- */

  const ticketBody = (
    <div className="space-y-4">
      {cart.length ? (
        <ul className="space-y-2.5">
          {cart.map((line) => {
            const product = state.products.find((p) => p.id === line.productId);
            if (!product) return null;
            const summary = summaryFor(line);
            return (
              <li
                key={line.key}
                className="flex items-start gap-2 rounded-xl2 border border-line bg-paper px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => openLine(line)}
                  aria-label={`Editar ${product.name}`}
                  className="focus-ring min-w-0 flex-1 rounded-lg text-left"
                >
                  <span className="block text-sm font-extrabold text-ink">
                    {line.qty}× {product.name}
                  </span>
                  {summary ? (
                    <span className="mt-0.5 block text-xs text-muted">{summary}</span>
                  ) : null}
                  {line.modifiers.notes ? (
                    <span className="mt-0.5 block text-xs italic text-muted">
                      {line.modifiers.notes}
                    </span>
                  ) : null}
                </button>
                <span className="shrink-0 pt-0.5 text-sm font-extrabold text-ink">
                  {money(lineUnitPrice(line) * line.qty)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  aria-label="Quitar"
                  className="focus-ring -mr-1 shrink-0 rounded-full p-1 text-sm font-bold text-muted transition hover:bg-cream hover:text-danger"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl2 border border-dashed border-line px-4 py-8 text-center text-sm leading-6 text-muted">
          Elige productos del catálogo para armar el ticket.
        </p>
      )}

      {/* ------------------------------- Promos -------------------------------- */}
      <div className="border-t border-line pt-4">
        <p className="eyebrow">Promoción</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMOS.map((promo) => (
            <Chip
              key={promo.pct}
              active={discountPct === promo.pct}
              onClick={() => setDiscountPct(promo.pct)}
            >
              {promo.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* ------------------------------- Lealtad -------------------------------- */}
      {state.flags.lealtad ? (
        <div className="border-t border-line pt-4">
          <p className="eyebrow">Lealtad</p>
          <select
            aria-label="Cliente de lealtad"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="focus-ring mt-2 w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink"
          >
            <option value="">Venta al público</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.points} pts
              </option>
            ))}
          </select>
          {selectedCustomer ? (
            <p className="mt-1.5 text-xs text-muted">
              Sumará {pointsFor(total)} puntos a {selectedCustomer.name}.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------- Totales -------------------------------- */}
      <div className="space-y-1.5 border-t border-line pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-bold text-ink">{money(subtotal)}</span>
        </div>
        {discountAmount > 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Descuento · {activePromo?.label}</span>
            <span className="font-bold text-matcha-deep">−{money(discountAmount)}</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-sm font-extrabold text-ink">Total</span>
          <span className="display text-2xl text-ink">{money(total)}</span>
        </div>
      </div>

      {/* --------------------------------- Pago ---------------------------------- */}
      <div className="border-t border-line pt-4">
        <p className="eyebrow">Método de pago</p>
        <div className="mt-2 space-y-2">
          {paymentOptions.map((opt) => {
            const selected = activePayment === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPayment(opt.id)}
                aria-pressed={selected}
                className={cx(
                  "focus-ring flex w-full items-center justify-between gap-3 rounded-xl2 border px-4 py-2.5 text-sm font-bold transition",
                  selected
                    ? "border-matcha bg-matcha-mist text-ink"
                    : "border-line bg-white text-ink hover:border-matcha",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden>{opt.emoji}</span>
                  {PAYMENT_META[opt.id].label}
                </span>
                {selected ? (
                  <span className="text-xs font-extrabold text-matcha-deep">✓ Elegido</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {activePayment === "efectivo" ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Chip
                active={cashReceived !== "" && received === total}
                onClick={() => setCashReceived(String(total))}
              >
                Exacto
              </Chip>
              <Chip
                active={cashReceived === "200"}
                onClick={() => setCashReceived("200")}
              >
                {money(200)}
              </Chip>
              <Chip
                active={cashReceived === "500"}
                onClick={() => setCashReceived("500")}
              >
                {money(500)}
              </Chip>
            </div>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              aria-label="Efectivo recibido"
              placeholder="Efectivo recibido"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="focus-ring w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink placeholder:font-normal placeholder:text-muted"
            />
            {cart.length ? (
              cashOk ? (
                <p className="text-xs font-extrabold text-matcha-deep">
                  Cambio: {money(received - total)}
                </p>
              ) : (
                <p className="text-xs font-extrabold text-danger">
                  Faltan {money(total - received)}
                </p>
              )
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted">
            Se simula la aprobación al instante — no se cobra nada.
          </p>
        )}
      </div>

      <Button
        variant="matcha"
        size="lg"
        className="w-full"
        disabled={!canCharge}
        onClick={handleCheckout}
      >
        Cobrar {money(total)}
      </Button>
      {cashClosedToday ? (
        <p className="text-center text-xs text-muted">
          La caja de hoy está cerrada; reábrela en Corte para cobrar.
        </p>
      ) : null}
    </div>
  );

  /* --------------------------------- Render --------------------------------- */

  return (
    <div className="space-y-6 pb-10 lg:pb-0">
      <PageHeader
        eyebrow={
          cashClosedToday
            ? "Caja cerrada · cobro simulado"
            : "Caja abierta · cobro simulado"
        }
        title="Punto de venta"
        desc="Arma el ticket, personaliza cada bebida y cobra en segundos. Todo es demo: ningún pago se procesa de verdad."
      />

      {cashClosedToday ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber/40 bg-amber/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              🔒
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">
                Ventas en pausa: el corte de hoy ya se registró
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted">
                Reabre la caja desde el módulo de corte para seguir cobrando.
              </p>
            </div>
          </div>
          <Link
            href="/corte"
            className="focus-ring rounded-full border border-amber/40 px-4 py-2 text-xs font-extrabold text-amber transition hover:bg-amber/10"
          >
            Ir a Corte de caja
          </Link>
        </Card>
      ) : null}

      <div className="gap-5 lg:grid lg:grid-cols-[1fr_360px]">
        {/* -------------------------------- Catálogo ------------------------------ */}
        <div className="min-w-0 space-y-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar bebida o bakery…"
            aria-label="Buscar producto"
            className="focus-ring w-full rounded-full border border-line bg-white px-5 py-2.5 text-sm text-ink placeholder:text-muted"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("todos")}
              aria-pressed={category === "todos"}
              className={cx(
                "focus-ring rounded-full px-4 py-2 text-xs font-extrabold transition",
                category === "todos"
                  ? "bg-ink text-paper"
                  : "border border-line bg-white text-ink hover:border-matcha",
              )}
            >
              Todos
            </button>
            {CATEGORY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                aria-pressed={category === id}
                className={cx(
                  "focus-ring rounded-full px-4 py-2 text-xs font-extrabold transition",
                  category === id
                    ? "bg-ink text-paper"
                    : "border border-line bg-white text-ink hover:border-matcha",
                )}
              >
                {CATEGORY_META[id].emoji} {CATEGORY_META[id].label}
              </button>
            ))}
          </div>

          {visibleProducts.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openProduct(p)}
                  className="card focus-ring flex flex-col gap-2.5 p-3 text-left transition hover:border-matcha"
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl2 bg-matcha-mist text-3xl"
                      aria-hidden
                    >
                      {p.emoji}
                    </span>
                    {p.popular ? (
                      <Badge tone="matcha" className="shrink-0">
                        Popular
                      </Badge>
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold leading-snug text-ink">
                      {p.name}
                    </span>
                    <span className="display block text-lg text-matcha-deep">
                      {money(p.price)}
                    </span>
                    <span className="block truncate text-xs text-muted">{p.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl2 border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
              Sin resultados. Prueba con otro nombre u otra categoría.
            </p>
          )}
        </div>

        {/* --------------------------- Ticket (escritorio) ------------------------- */}
        <div className="hidden self-start lg:sticky lg:top-24 lg:block">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="display text-2xl text-ink">Ticket</h2>
              <DemoTag />
            </div>
            {ticketBody}
          </Card>
        </div>
      </div>

      {/* ------------------------ Barra flotante (móvil) -------------------------- */}
      {itemCount > 0 ? (
        <button
          type="button"
          onClick={() => setMobileTicketOpen(true)}
          className="focus-ring animate-rise fixed inset-x-4 bottom-16 z-30 flex items-center justify-between gap-3 rounded-full bg-ink px-5 py-3.5 text-paper shadow-lift lg:hidden"
        >
          <span className="text-sm font-extrabold">
            🧾 Ticket · {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
          </span>
          <span className="display text-lg">{money(total)}</span>
        </button>
      ) : null}

      <Modal
        open={mobileTicketOpen}
        onClose={() => setMobileTicketOpen(false)}
        title={
          <span className="inline-flex items-center gap-2.5">
            Ticket <DemoTag />
          </span>
        }
      >
        {ticketBody}
      </Modal>

      {/* ------------------------ Modal de personalización ------------------------ */}
      <Modal
        open={!!draft && !!draftProduct}
        onClose={() => setDraft(null)}
        title={draftProduct ? `${draftProduct.emoji} ${draftProduct.name}` : ""}
      >
        {draft && draftProduct ? (
          <div className="space-y-5">
            <p className="-mt-2 text-sm leading-6 text-muted">{draftProduct.desc}</p>

            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Cantidad</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, qty: Math.max(1, draft.qty - 1) })}
                  disabled={draft.qty <= 1}
                  aria-label="Restar una unidad"
                  className="focus-ring h-10 w-10 rounded-full border border-line text-lg font-extrabold text-ink transition hover:border-matcha disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span className="display w-8 text-center text-xl text-ink">
                  {draft.qty}
                </span>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, qty: Math.min(9, draft.qty + 1) })}
                  disabled={draft.qty >= 9}
                  aria-label="Sumar una unidad"
                  className="focus-ring h-10 w-10 rounded-full border border-line text-lg font-extrabold text-ink transition hover:border-matcha disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            {draftProduct.mods.milk ? (
              <div>
                <p className="eyebrow">Leche</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {state.milks
                    .filter((m) => m.available)
                    .map((m) => (
                      <Chip
                        key={m.id}
                        active={draft.milkId === m.id}
                        onClick={() => setDraft({ ...draft, milkId: m.id })}
                      >
                        {m.name}
                        {m.surcharge > 0 ? ` +${money(m.surcharge)}` : ""}
                      </Chip>
                    ))}
                </div>
              </div>
            ) : null}

            {draftProduct.mods.sweetness ? (
              <div>
                <p className="eyebrow">Dulzor</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SWEETNESS_STEPS.map((s) => (
                    <Chip
                      key={s}
                      active={draft.sweetness === s}
                      onClick={() => setDraft({ ...draft, sweetness: s })}
                    >
                      {sweetnessLabel(s)}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            {draftProduct.mods.temperature ? (
              <div>
                <p className="eyebrow">Temperatura</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["caliente", "frio"] as Temperature[]).map((t) => (
                    <Chip
                      key={t}
                      active={draft.temperature === t}
                      onClick={() => setDraft({ ...draft, temperature: t })}
                    >
                      {TEMP_LABEL[t]} {TEMP_EMOJI[t]}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            {draftProduct.mods.extras ? (
              <div>
                <p className="eyebrow">Extras</p>
                <div className="mt-2 space-y-2">
                  {state.extras
                    .filter((e) => e.available)
                    .map((e) => {
                      const on = draft.extraIds.includes(e.id);
                      return (
                        <label
                          key={e.id}
                          className={cx(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-xl2 border px-3.5 py-2.5 text-sm font-bold text-ink transition",
                            on
                              ? "border-matcha bg-matcha-mist"
                              : "border-line bg-white hover:border-matcha",
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() =>
                                setDraft({
                                  ...draft,
                                  extraIds: on
                                    ? draft.extraIds.filter((id) => id !== e.id)
                                    : [...draft.extraIds, e.id],
                                })
                              }
                              className="h-4 w-4 accent-matcha-deep"
                            />
                            {e.name}
                          </span>
                          <span className="text-xs font-extrabold text-muted">
                            +{money(e.price)}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            ) : null}

            <div>
              <p className="eyebrow">Notas para barra</p>
              <input
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Ej. sin popote, nombre para el vaso…"
                aria-label="Notas para barra"
                className="focus-ring mt-2 w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted"
              />
            </div>

            <Button variant="matcha" className="w-full" onClick={confirmDraft}>
              {draft.lineKey ? "Guardar" : "Agregar"} · {money(draftUnit * draft.qty)}
            </Button>
          </div>
        ) : null}
      </Modal>

      {/* ----------------------------- Modal de éxito ----------------------------- */}
      <Modal
        open={!!success}
        onClose={() => setSuccess(null)}
        title="Cobro completado"
      >
        {success ? (
          <div className="text-center">
            <span className="text-5xl" aria-hidden>
              🎉
            </span>
            <p className="display mt-4 text-2xl text-ink">
              Venta #{success.folio} registrada
            </p>
            <p className="display mt-2 text-3xl text-matcha-deep">
              {money(success.total)}
            </p>
            <p className="mt-2 text-sm text-muted">
              Pago: {PAYMENT_META[success.payment].label}
            </p>
            {success.pointsEarned ? (
              <p className="mt-1 text-sm text-muted">
                {success.customerName} sumó {success.pointsEarned} puntos de lealtad.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="ghost" onClick={() => setSuccess(null)}>
                Nueva venta
              </Button>
              <Link
                href="/comandas"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-matcha-deep px-5 py-2.5 text-sm font-bold text-paper shadow-pop transition hover:bg-matcha"
              >
                Ver comanda
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
