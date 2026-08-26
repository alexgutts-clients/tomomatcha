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
import type { ActionResult } from "./action-utils";
import { refreshState } from "./actions";
import { attachMedia, requestUpload } from "./actions-admin";
import { dayKey } from "./format";
import type {
  AppState,
  CashClose,
  Ingredient,
  Order,
  OrderItem,
  Product,
} from "./types";

/* ============================================================================
 * Estado de la aplicación en el navegador.
 *
 * El servidor es la única fuente de verdad: cada mutación devuelve el estado
 * completo recién leído de la base y aquí sólo se reemplaza. No hay copias
 * locales que se puedan desincronizar, lo que importa cuando hay dos cajas
 * cobrando a la vez.
 *
 * Además se refresca solo cada pocos segundos mientras la pestaña está visible,
 * para que el tablero de comandas de la barra vea lo que cobra la caja.
 * ========================================================================== */

const POLL_MS = 15_000;

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: "ok" | "warn";
}

export interface SubmitOptions<T> {
  /** Aviso al terminar bien. Con función, se arma a partir del resultado. */
  title?: string | ((data: T) => string);
  detail?: string | ((data: T) => string | undefined);
  /** `true` para no mostrar aviso de éxito (cambios pequeños y evidentes). */
  silent?: boolean;
}

interface StoreValue {
  state: AppState;
  /** Zona horaria del negocio: todo el formato de fechas la usa. */
  tz: string;
  currency: string;
  /** Hay al menos una mutación en vuelo. */
  busy: boolean;
  toasts: Toast[];
  notify: (title: string, detail?: string, tone?: Toast["tone"]) => void;
  refresh: () => Promise<void>;
  /** Ejecuta una server action, sincroniza el estado y avisa del resultado. */
  submit: <T>(
    action: () => Promise<ActionResult<T>>,
    options?: SubmitOptions<T>,
  ) => Promise<T | null>;
  /** Sube un archivo a R2 y lo asocia a un producto o al logo. */
  uploadMedia: (
    file: File,
    target: { purpose: "producto"; productId: string } | { purpose: "logo" },
  ) => Promise<boolean>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  initialState,
  children,
}: {
  initialState: AppState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AppState>(initialState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState(0);
  const toastId = useRef(0);
  const pendingRef = useRef(0);
  const loadedAt = useRef(initialState.loadedAt);

  // El layout del servidor vuelve a renderizar tras `revalidatePath`; cuando
  // llega un estado más nuevo, se adopta.
  useEffect(() => {
    if (initialState.loadedAt > loadedAt.current) {
      loadedAt.current = initialState.loadedAt;
      setState(initialState);
    }
  }, [initialState]);

  const adopt = useCallback((next: AppState) => {
    loadedAt.current = next.loadedAt;
    setState(next);
  }, []);

  const notify = useCallback(
    (title: string, detail?: string, tone: Toast["tone"] = "ok") => {
      const id = ++toastId.current;
      setToasts((list) => [...list.slice(-2), { id, title, detail, tone }]);
      window.setTimeout(() => {
        setToasts((list) => list.filter((toast) => toast.id !== id));
      }, tone === "warn" ? 6000 : 3800);
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const result = await refreshState();
      if (result.ok) adopt(result.state);
    } catch {
      // Sin red: se reintenta en el siguiente ciclo, sin molestar al usuario.
    }
  }, [adopt]);

  const submit = useCallback(
    async function submit<T>(
      action: () => Promise<ActionResult<T>>,
      options: SubmitOptions<T> = {},
    ): Promise<T | null> {
      pendingRef.current += 1;
      setPending((n) => n + 1);
      try {
        const result = await action();
        if (!result.ok) {
          notify("No se pudo guardar", result.error, "warn");
          return null;
        }
        adopt(result.state);
        if (!options.silent) {
          const title =
            typeof options.title === "function"
              ? options.title(result.data)
              : (options.title ?? "Listo");
          const detail =
            typeof options.detail === "function"
              ? options.detail(result.data)
              : options.detail;
          notify(title, detail);
        }
        return result.data;
      } catch (error) {
        notify(
          "Se perdió la conexión",
          error instanceof Error ? error.message : undefined,
          "warn",
        );
        return null;
      } finally {
        pendingRef.current -= 1;
        setPending((n) => Math.max(0, n - 1));
      }
    },
    [adopt, notify],
  );

  const uploadMedia = useCallback<StoreValue["uploadMedia"]>(
    async (file, target) => {
      const ticket = await submit(
        () =>
          requestUpload({
            purpose: target.purpose,
            contentType: file.type,
            size: file.size,
            name: file.name,
          }),
        { silent: true },
      );
      if (!ticket) return false;

      try {
        const response = await fetch(ticket.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!response.ok) {
          notify(
            "La subida fue rechazada",
            `Cloudflare respondió ${response.status}. Si es un error de CORS, revisa la configuración del bucket en INSTRUCCIONES.md.`,
            "warn",
          );
          return false;
        }
      } catch {
        notify(
          "No se pudo subir el archivo",
          "El navegador no alcanzó el bucket de R2. Suele ser la configuración de CORS; está explicada en INSTRUCCIONES.md.",
          "warn",
        );
        return false;
      }

      const attached = await submit(
        () =>
          attachMedia({
            key: ticket.key,
            purpose: target.purpose,
            contentType: file.type,
            size: file.size,
            name: file.name,
            productId: target.purpose === "producto" ? target.productId : undefined,
          }),
        { title: "Imagen actualizada" },
      );
      return attached !== null;
    },
    [notify, submit],
  );

  /* ----------------------------- Refresco periódico ------------------------- */

  useEffect(() => {
    let timer: number | undefined;

    const tick = () => {
      if (document.visibilityState === "visible" && pendingRef.current === 0) {
        void refresh();
      }
      timer = window.setTimeout(tick, POLL_MS);
    };

    timer = window.setTimeout(tick, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      tz: state.settings.timezone,
      currency: state.settings.currency,
      busy: pending > 0,
      toasts,
      notify,
      refresh,
      submit,
      uploadMedia,
    }),
    [state, pending, toasts, notify, refresh, submit, uploadMedia],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

/* --------------------------- Selectores derivados ---------------------------- */

export interface Derived {
  todayKey: string;
  todayOrders: Order[];
  todaySales: number;
  todayUnits: number;
  activeOrders: Order[];
  lowStock: Ingredient[];
  cashClosedToday: boolean;
  todayClose: CashClose | undefined;
  topProducts: {
    product: Product;
    qty: number;
    revenue: number;
    /** El producto ya no está en el menú; se reconstruyó del histórico. */
    deleted: boolean;
  }[];
  /** Ventas por día operativo de los últimos 7 días, del más viejo al más nuevo */
  week: { key: string; total: number }[];
}

/**
 * Reconstruye un producto a partir de la foto que guardó el renglón, para poder
 * seguir mostrando en los reportes algo que ya no está en el menú. No se puede
 * volver a vender: sólo sirve para nombrarlo y pintarlo.
 */
function productFromItem(item: OrderItem): Product {
  return {
    id: item.productId ?? `eliminado:${item.name}`,
    name: item.name,
    // El renglón no guarda la categoría, y el producto ya no existe para
    // preguntársela: se deja vacía y los reportes lo nombran «fuera del menú».
    category: "",
    price: item.unitPrice,
    desc: "",
    emoji: item.emoji,
    imageKey: item.imageKey,
    active: false,
    popular: false,
    sortOrder: 0,
    recipe: [],
    mods: { milk: false, sweetness: false, temperature: false, extras: false },
  };
}

/** Los tickets cancelados no cuentan como venta en ningún cálculo. */
export function isSale(order: Order): boolean {
  return order.status !== "cancelado";
}

export function useDerived(): Derived {
  const { state } = useStore();

  return useMemo(() => {
    const tz = state.settings.timezone;
    const today = state.todayKey;
    const sales = state.orders.filter(isSale);

    const todayOrders = sales.filter((o) => dayKey(o.createdAt, tz) === today);
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayUnits = todayOrders.reduce(
      (sum, o) => sum + o.items.reduce((n, it) => n + it.qty, 0),
      0,
    );

    const activeOrders = state.orders
      .filter(
        (o) =>
          o.status === "nuevo" || o.status === "preparando" || o.status === "listo",
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const lowStock = state.ingredients.filter(
      (i) => i.active && i.stock <= i.min,
    );

    const todayClose = state.cashCloses.find((c) => c.dateKey === today);

    /*
     * Más vendidos. Se agrupa por producto cuando todavía existe y, si no, por
     * el nombre que quedó grabado en el renglón: un producto eliminado del menú
     * sí se vendió, y ocultarlo haría que los totales del reporte no cuadren
     * con las ventas. Por eso cada renglón guarda su propia foto del producto.
     */
    const productCount = new Map<
      string,
      { qty: number; revenue: number; product: Product; deleted: boolean }
    >();
    for (const order of sales) {
      for (const item of order.items) {
        const live = item.productId
          ? state.products.find((p) => p.id === item.productId)
          : undefined;
        const key = live ? live.id : `nombre:${item.name.toLowerCase()}`;
        const acc = productCount.get(key) ?? {
          qty: 0,
          revenue: 0,
          product: live ?? productFromItem(item),
          deleted: !live,
        };
        acc.qty += item.qty;
        acc.revenue += (item.unitPrice + item.modsPrice) * item.qty;
        productCount.set(key, acc);
      }
    }
    const topProducts = [...productCount.values()].sort((a, b) => b.qty - a.qty);

    // Las últimas 7 claves de día operativo, contadas hacia atrás desde hoy.
    const weekKeys: string[] = [];
    const [y, m, d] = today.split("-").map(Number);
    const anchor = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
    for (let i = 6; i >= 0; i--) {
      const date = new Date(anchor - i * 86_400_000);
      weekKeys.push(
        `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
          date.getUTCDate(),
        ).padStart(2, "0")}`,
      );
    }
    const week = weekKeys.map((key) => ({ key, total: 0 }));
    for (const order of sales) {
      const slot = week.find((w) => w.key === dayKey(order.createdAt, tz));
      if (slot) slot.total += order.total;
    }

    return {
      todayKey: today,
      todayOrders,
      todaySales,
      todayUnits,
      activeOrders,
      lowStock,
      cashClosedToday: !!todayClose,
      todayClose,
      topProducts,
      week,
    };
  }, [state]);
}
