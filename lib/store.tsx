"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildSeedState, STATE_VERSION } from "./seed";
import { dayKey, todayKey } from "./format";
import {
  CashClose,
  CheckoutPayload,
  DemoState,
  FeatureFlags,
  ModifierSupport,
  Order,
  ORDER_FLOW,
  OrderItem,
  pointsFor,
  Role,
} from "./types";

const STORAGE_KEY = "tomomatcha-demo";

/* --------------------------------- Toasts ----------------------------------- */

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: "ok" | "warn";
}

/* -------------------------------- Contexto ---------------------------------- */

interface StoreValue {
  state: DemoState;
  toasts: Toast[];
  notify: (title: string, detail?: string, tone?: Toast["tone"]) => void;
  setRole: (role: Role) => void;
  setFlag: (flag: keyof FeatureFlags, value: boolean) => void;
  resetDemo: () => void;
  checkout: (payload: CheckoutPayload) => Order | null;
  moveOrder: (orderId: string, dir: 1 | -1) => void;
  adjustStock: (ingredientId: string, delta: number) => void;
  toggleProduct: (productId: string) => void;
  setProductPrice: (productId: string, price: number) => void;
  setProductMod: (productId: string, mod: keyof ModifierSupport, value: boolean) => void;
  toggleMilk: (milkId: string) => void;
  toggleExtra: (extraId: string) => void;
  addPoints: (customerId: string, points: number, reason?: string) => void;
  redeemReward: (customerId: string, cost: number, label: string) => void;
  closeCash: (countedCash: number, notes?: string) => void;
  reopenCash: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/* ------------------------------- Utilidades ---------------------------------- */

function loadState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* estado corrupto: se regenera la demo */
  }
  return buildSeedState();
}

/** Insumos consumidos por un renglón de pedido, según receta + leche + extras. */
function consumptionFor(state: DemoState, item: OrderItem): Map<string, number> {
  const usage = new Map<string, number>();
  const product = state.products.find((p) => p.id === item.productId);
  if (!product) return usage;

  const add = (id: string, qty: number) => {
    usage.set(id, (usage.get(id) ?? 0) + qty * item.qty);
  };

  for (const r of product.recipe) {
    if (r.ingredientId === "milk") {
      const milk = state.milks.find((m) => m.id === item.modifiers.milkId);
      if (milk?.ingredientId) add(milk.ingredientId, r.qty);
    } else {
      add(r.ingredientId, r.qty);
    }
  }
  for (const extraId of item.modifiers.extraIds) {
    const extra = state.extras.find((e) => e.id === extraId);
    extra?.recipe.forEach((r) => {
      if (r.ingredientId !== "milk") add(r.ingredientId, r.qty);
    });
  }
  return usage;
}

/* -------------------------------- Provider ----------------------------------- */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (state) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* almacenamiento lleno o bloqueado: la demo sigue en memoria */
      }
    }
  }, [state]);

  const notify = useCallback(
    (title: string, detail?: string, tone: Toast["tone"] = "ok") => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, title, detail, tone }]);
      window.setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.id !== id));
      }, 3800);
    },
    [],
  );

  const mutate = useCallback((fn: (s: DemoState) => DemoState) => {
    setState((s) => (s ? fn(s) : s));
  }, []);

  const setRole = useCallback(
    (role: Role) => mutate((s) => ({ ...s, role })),
    [mutate],
  );

  const setFlag = useCallback(
    (flag: keyof FeatureFlags, value: boolean) =>
      mutate((s) => ({ ...s, flags: { ...s.flags, [flag]: value } })),
    [mutate],
  );

  const resetDemo = useCallback(() => {
    const fresh = buildSeedState();
    setState(fresh);
    notify("Demo restablecida", "Todos los datos volvieron a su estado inicial.");
  }, [notify]);

  const checkout = useCallback(
    (payload: CheckoutPayload): Order | null => {
      let created: Order | null = null;
      mutate((s) => {
        if (!payload.lines.length) return s;

        const items: OrderItem[] = payload.lines.map((line) => {
          const product = s.products.find((p) => p.id === line.productId)!;
          const milk = s.milks.find((m) => m.id === line.modifiers.milkId);
          const extrasPrice = line.modifiers.extraIds.reduce(
            (sum, id) => sum + (s.extras.find((e) => e.id === id)?.price ?? 0),
            0,
          );
          return {
            productId: product.id,
            name: product.name,
            emoji: product.emoji,
            qty: line.qty,
            unitPrice: product.price,
            modsPrice: (milk?.surcharge ?? 0) + extrasPrice,
            modifiers: { ...line.modifiers, extraIds: [...line.modifiers.extraIds] },
          };
        });

        const subtotal = items.reduce(
          (sum, it) => sum + (it.unitPrice + it.modsPrice) * it.qty,
          0,
        );
        const total = Math.round(subtotal * (1 - payload.discountPct / 100));
        const customer = s.customers.find((c) => c.id === payload.customerId);
        const earned = customer && s.flags.lealtad ? pointsFor(total) : undefined;

        const order: Order = {
          id: `ord-${Date.now()}-${s.nextFolio}`,
          folio: s.nextFolio,
          items,
          subtotal,
          discountPct: payload.discountPct,
          discountLabel: payload.discountLabel,
          total,
          payment: payload.payment,
          status: "nuevo",
          createdAt: new Date().toISOString(),
          customerId: customer?.id,
          customerName: customer?.name,
          pointsEarned: earned,
        };
        created = order;

        // Descuento de inventario por receta (leche elegida incluida)
        const usage = new Map<string, number>();
        for (const item of items) {
          consumptionFor(s, item).forEach((qty, id) =>
            usage.set(id, (usage.get(id) ?? 0) + qty),
          );
        }
        const ingredients = s.ingredients.map((ing) =>
          usage.has(ing.id)
            ? { ...ing, stock: Math.max(0, Math.round((ing.stock - usage.get(ing.id)!) * 100) / 100) }
            : ing,
        );

        const customers = customer
          ? s.customers.map((c) =>
              c.id === customer.id
                ? {
                    ...c,
                    points: c.points + (earned ?? 0),
                    visits: c.visits + 1,
                    lastVisit: order.createdAt,
                  }
                : c,
            )
          : s.customers;

        return {
          ...s,
          orders: [...s.orders, order],
          ingredients,
          customers,
          nextFolio: s.nextFolio + 1,
        };
      });
      return created;
    },
    [mutate],
  );

  const moveOrder = useCallback(
    (orderId: string, dir: 1 | -1) =>
      mutate((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== orderId) return o;
          const idx = ORDER_FLOW.indexOf(o.status);
          const next = ORDER_FLOW[Math.min(Math.max(idx + dir, 0), ORDER_FLOW.length - 1)];
          return {
            ...o,
            status: next,
            deliveredAt:
              next === "entregado"
                ? new Date().toISOString()
                : next !== o.status
                  ? undefined
                  : o.deliveredAt,
          };
        }),
      })),
    [mutate],
  );

  const adjustStock = useCallback(
    (ingredientId: string, delta: number) =>
      mutate((s) => ({
        ...s,
        ingredients: s.ingredients.map((ing) =>
          ing.id === ingredientId
            ? { ...ing, stock: Math.max(0, Math.round((ing.stock + delta) * 100) / 100) }
            : ing,
        ),
      })),
    [mutate],
  );

  const toggleProduct = useCallback(
    (productId: string) =>
      mutate((s) => ({
        ...s,
        products: s.products.map((p) =>
          p.id === productId ? { ...p, active: !p.active } : p,
        ),
      })),
    [mutate],
  );

  const setProductPrice = useCallback(
    (productId: string, price: number) =>
      mutate((s) => ({
        ...s,
        products: s.products.map((p) =>
          p.id === productId ? { ...p, price: Math.max(0, Math.round(price)) } : p,
        ),
      })),
    [mutate],
  );

  const setProductMod = useCallback(
    (productId: string, mod: keyof ModifierSupport, value: boolean) =>
      mutate((s) => ({
        ...s,
        products: s.products.map((p) =>
          p.id === productId ? { ...p, mods: { ...p.mods, [mod]: value } } : p,
        ),
      })),
    [mutate],
  );

  const toggleMilk = useCallback(
    (milkId: string) =>
      mutate((s) => ({
        ...s,
        milks: s.milks.map((m) =>
          m.id === milkId ? { ...m, available: !m.available } : m,
        ),
      })),
    [mutate],
  );

  const toggleExtra = useCallback(
    (extraId: string) =>
      mutate((s) => ({
        ...s,
        extras: s.extras.map((e) =>
          e.id === extraId ? { ...e, available: !e.available } : e,
        ),
      })),
    [mutate],
  );

  const addPoints = useCallback(
    (customerId: string, points: number, reason?: string) => {
      mutate((s) => ({
        ...s,
        customers: s.customers.map((c) =>
          c.id === customerId ? { ...c, points: c.points + points } : c,
        ),
      }));
      if (reason) notify("Puntos actualizados", reason);
    },
    [mutate, notify],
  );

  const redeemReward = useCallback(
    (customerId: string, cost: number, label: string) => {
      mutate((s) => ({
        ...s,
        customers: s.customers.map((c) =>
          c.id === customerId && c.points >= cost
            ? { ...c, points: c.points - cost }
            : c,
        ),
      }));
      notify("Recompensa canjeada (demo)", label);
    },
    [mutate, notify],
  );

  const closeCash = useCallback(
    (countedCash: number, notes?: string) =>
      mutate((s) => {
        const key = todayKey();
        if (s.cashCloses.some((c) => c.dateKey === key)) return s;
        const todays = s.orders.filter((o) => dayKey(o.createdAt) === key);
        const expectedCash = todays
          .filter((o) => o.payment === "efectivo")
          .reduce((sum, o) => sum + o.total, 0);
        const expectedCard = todays
          .filter((o) => o.payment !== "efectivo")
          .reduce((sum, o) => sum + o.total, 0);
        const close: CashClose = {
          id: `close-${key}-${Date.now()}`,
          dateKey: key,
          closedAt: new Date().toISOString(),
          expectedCash,
          expectedCard,
          countedCash,
          difference: Math.round((countedCash - expectedCash) * 100) / 100,
          orders: todays.length,
          notes: notes || undefined,
          closedBy: s.role === "admin" ? "Administrador demo" : "Empleado demo",
        };
        return { ...s, cashCloses: [...s.cashCloses, close] };
      }),
    [mutate],
  );

  const reopenCash = useCallback(
    () =>
      mutate((s) => ({
        ...s,
        cashCloses: s.cashCloses.filter((c) => c.dateKey !== todayKey()),
      })),
    [mutate],
  );

  const value = useMemo<StoreValue | null>(() => {
    if (!state) return null;
    return {
      state,
      toasts,
      notify,
      setRole,
      setFlag,
      resetDemo,
      checkout,
      moveOrder,
      adjustStock,
      toggleProduct,
      setProductPrice,
      setProductMod,
      toggleMilk,
      toggleExtra,
      addPoints,
      redeemReward,
      closeCash,
      reopenCash,
    };
  }, [
    state,
    toasts,
    notify,
    setRole,
    setFlag,
    resetDemo,
    checkout,
    moveOrder,
    adjustStock,
    toggleProduct,
    setProductPrice,
    setProductMod,
    toggleMilk,
    toggleExtra,
    addPoints,
    redeemReward,
    closeCash,
    reopenCash,
  ]);

  if (!value) return <Splash />;

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="text-center">
        <p className="display text-4xl text-ink">
          Tomo<span className="text-matcha-deep">Matcha</span>
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-muted">
          Preparando la demo…
        </p>
      </div>
    </div>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

/* --------------------------- Selectores derivados ---------------------------- */

export function useDerived() {
  const { state } = useStore();
  return useMemo(() => {
    const tKey = todayKey();
    const todayOrders = state.orders.filter((o) => dayKey(o.createdAt) === tKey);
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayUnits = todayOrders.reduce(
      (sum, o) => sum + o.items.reduce((n, it) => n + it.qty, 0),
      0,
    );
    const activeOrders = state.orders
      .filter((o) => o.status !== "entregado")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const lowStock = state.ingredients.filter((i) => i.stock <= i.min);
    const cashClosedToday = state.cashCloses.some((c) => c.dateKey === tKey);

    const productCount = new Map<string, { qty: number; revenue: number }>();
    for (const o of state.orders) {
      for (const it of o.items) {
        const acc = productCount.get(it.productId) ?? { qty: 0, revenue: 0 };
        acc.qty += it.qty;
        acc.revenue += (it.unitPrice + it.modsPrice) * it.qty;
        productCount.set(it.productId, acc);
      }
    }
    const topProducts = [...productCount.entries()]
      .map(([productId, data]) => ({
        product: state.products.find((p) => p.id === productId),
        ...data,
      }))
      .filter((e) => e.product)
      .sort((a, b) => b.qty - a.qty);

    return {
      todayOrders,
      todaySales,
      todayUnits,
      activeOrders,
      lowStock,
      cashClosedToday,
      topProducts,
    };
  }, [state]);
}
