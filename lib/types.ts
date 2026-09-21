/* ============================================================================
 * Tipos de dominio de TomoMatcha.
 *
 * Son la forma en que la aplicación (servidor y cliente) ve los datos; la capa
 * `lib/data.ts` los construye a partir de las filas de Supabase.
 * ========================================================================== */

export type Role = "admin" | "empleado";

/**
 * Identificador de categoría: un slug de texto ('matcha', 'mercancia', …). Ya
 * no es una unión cerrada porque las categorías las crea el administrador desde
 * Productos; la lista viva está en `AppState.categories`.
 */
export type CategoryId = string;

export type Unit = "g" | "ml" | "pza";

export interface Staff {
  id: string;
  clerkUserId: string;
  email: string | null;
  fullName: string;
  imageUrl: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  stock: number;
  /** Umbral: por debajo de esto el insumo entra en alerta */
  min: number;
  /** Consumo típico semanal, referencia para resurtir */
  weeklyUse: number;
  /** Vasos, tapas, servilletas: solo se gastan en pedidos para llevar */
  isPackaging: boolean;
  /** Nivel objetivo de resurtido. Permite leer el umbral como porcentaje. */
  parLevel: number | null;
  active: boolean;
}

export interface Category {
  /** Slug estable. No cambia al renombrar: las ventas ya lo tienen escrito. */
  id: CategoryId;
  label: string;
  emoji: string;
  sortOrder: number;
  /** Apagada: deja de ofrecerse, pero sus productos se siguen vendiendo. */
  active: boolean;
}

export interface RecipeItem {
  /** `"milk"` se resuelve con la leche que elige el cliente en el punto de venta */
  ingredientId: string | "milk";
  qty: number;
}

export interface ModifierSupport {
  milk: boolean;
  sweetness: boolean;
  temperature: boolean;
  extras: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  price: number;
  desc: string;
  emoji: string;
  imageKey: string | null;
  active: boolean;
  popular: boolean;
  sortOrder: number;
  recipe: RecipeItem[];
  mods: ModifierSupport;
}

export interface MilkOption {
  id: string;
  name: string;
  surcharge: number;
  ingredientId: string | null;
  available: boolean;
  sortOrder: number;
}

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
  recipe: RecipeItem[];
  available: boolean;
  sortOrder: number;
}

export type Sweetness = 0 | 25 | 50 | 75 | 100;
export type Temperature = "caliente" | "frio";

export interface OrderExtraSnapshot {
  id: string;
  name: string;
  price: number;
}

export interface LineModifiers {
  milkId?: string;
  /** Nombre de la leche al momento de la venta (el histórico no cambia después) */
  milkName?: string;
  sweetness?: Sweetness;
  temperature?: Temperature;
  extraIds: string[];
  extras?: OrderExtraSnapshot[];
  notes?: string;
}

export interface OrderItem {
  /** Identificador del renglón, necesario para poder quitarlo del ticket. */
  id: string;
  productId: string | null;
  name: string;
  emoji: string;
  imageKey: string | null;
  qty: number;
  unitPrice: number;
  /** Cargo adicional por leche y extras, por unidad */
  modsPrice: number;
  modifiers: LineModifiers;
}

export type OrderStatus =
  | "nuevo"
  | "preparando"
  | "listo"
  | "entregado"
  | "cancelado";

export type PaymentMethod = "efectivo" | "tarjeta" | "mercadopago";

/** Dónde se consume el pedido. Decide si se gasta empaque o no. */
export type ServiceMode = "aqui" | "llevar";

export const SERVICE_META: Record<
  ServiceMode,
  { label: string; short: string; emoji: string }
> = {
  aqui: { label: "Para aquí", short: "Aquí", emoji: "🍽️" },
  llevar: { label: "Para llevar", short: "Llevar", emoji: "🥤" },
};

export interface Order {
  id: string;
  folio: number;
  items: OrderItem[];
  subtotal: number;
  discountPct: number;
  discountLabel?: string;
  /** Propina dejada por el cliente. Ya viene incluida en `total`. */
  tip: number;
  total: number;
  payment: PaymentMethod;
  status: OrderStatus;
  serviceMode: ServiceMode;
  createdAt: string;
  deliveredAt?: string;
  customerId?: string;
  customerName?: string;
  pointsEarned?: number;
  createdByName?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  points: number;
  visits: number;
  cardToken: string;
  since: string;
  lastVisit: string | null;
}

/** Producto elaborado en casa: lo que importa de él es la caducidad. */
export interface PreparedItem {
  id: string;
  name: string;
  qty: number;
  unit: Unit;
  producedOn: string;
  expiresOn: string;
  notes: string;
  acknowledgedAt: string | null;
  discardedAt: string | null;
}

export interface CashClose {
  id: string;
  dateKey: string;
  closedAt: string;
  expectedCash: number;
  expectedCard: number;
  countedCash: number;
  difference: number;
  /** Propina cobrada en efectivo: la parte del cajón que se reparte. */
  tipsCash: number;
  /** Propina del día por todos los métodos de pago. */
  tipsTotal: number;
  orders: number;
  notes?: string;
  closedBy: string;
}

export interface FeatureFlags {
  inventario: boolean;
  lealtad: boolean;
  resenasGoogle: boolean;
  mercadoPago: boolean;
}

export interface Settings {
  businessName: string;
  branchName: string;
  timezone: string;
  currency: string;
  logoKey: string | null;
  cashFloat: number;
  pointsPerCurrency: number;
  rewardCost: number;
  googleReviewUrl: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  catalogSeededAt: string | null;
}

/** Todo lo que la aplicación necesita para pintar cualquier módulo. */
export interface AppState {
  /** Momento en que el servidor construyó este estado */
  loadedAt: string;
  /** Día operativo (YYYY-MM-DD) en la zona horaria del negocio */
  todayKey: string;
  me: Staff;
  role: Role;
  settings: Settings;
  flags: FeatureFlags;
  staff: Staff[];
  categories: Category[];
  products: Product[];
  ingredients: Ingredient[];
  milks: MilkOption[];
  extras: ExtraOption[];
  orders: Order[];
  customers: Customer[];
  preparedItems: PreparedItem[];
  cashCloses: CashClose[];
  /** Configuración de infraestructura visible para la interfaz */
  media: { configured: boolean; publicBase: string | null };
}

export interface CartLine {
  key: string;
  productId: string;
  qty: number;
  modifiers: LineModifiers;
}

export interface CheckoutPayload {
  lines: CartLine[];
  discountPct: number;
  discountLabel?: string;
  payment: PaymentMethod;
  serviceMode: ServiceMode;
  /** Propina en importe. El servidor la valida contra el consumo. */
  tip?: number;
  customerId?: string;
  cashReceived?: number;
}

/** Emoji de una categoría recién creada, hasta que el administrador elija otro. */
export const CATEGORY_FALLBACK_EMOJI = "🏷️";

/**
 * Nombre visible de una categoría. Un producto puede quedar apuntando a una
 * categoría recién borrada mientras el cliente no ha recargado su estado, así
 * que la búsqueda siempre tiene salida: se muestra el slug antes que nada.
 */
export function categoryLabel(
  categories: Category[],
  id: CategoryId,
): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

export function categoryEmoji(categories: Category[], id: CategoryId): string {
  return categories.find((c) => c.id === id)?.emoji ?? CATEGORY_FALLBACK_EMOJI;
}

/**
 * Slug a partir del nombre escrito: sin acentos, minúsculas y con guiones.
 * El servidor lo vuelve a calcular — esto sólo sirve para que la interfaz pueda
 * anticipar el identificador — pero la regla tiene que ser la misma en los dos
 * lados, así que vive aquí y no duplicada.
 */
export function slugifyCategory(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export const UNIT_LABELS: Record<Unit, string> = {
  g: "gramos",
  ml: "mililitros",
  pza: "piezas",
};

/** Estados por los que avanza una comanda en la barra. */
export const ORDER_FLOW: OrderStatus[] = [
  "nuevo",
  "preparando",
  "listo",
  "entregado",
];

export const STATUS_META: Record<
  OrderStatus,
  { label: string; action: string }
> = {
  nuevo: { label: "Nuevo", action: "Empezar preparación" },
  preparando: { label: "En preparación", action: "Marcar listo" },
  listo: { label: "Listo", action: "Entregar" },
  entregado: { label: "Entregado", action: "" },
  cancelado: { label: "Cancelado", action: "" },
};

export const PAYMENT_META: Record<
  PaymentMethod,
  { label: string; short: string }
> = {
  efectivo: { label: "Efectivo", short: "Efectivo" },
  tarjeta: { label: "Tarjeta", short: "Tarjeta" },
  mercadopago: { label: "Mercado Pago", short: "Mercado Pago" },
};

export const SWEETNESS_STEPS: Sweetness[] = [0, 25, 50, 75, 100];

/** Puntos de lealtad ganados por una compra. */
export function pointsFor(total: number, pointsPerCurrency = 1): number {
  return Math.round(total * pointsPerCurrency);
}

export function loyaltyTier(points: number): {
  name: string;
  next: number | null;
} {
  if (points >= 1500) return { name: "Ceremonial", next: null };
  if (points >= 600) return { name: "Hoja", next: 1500 };
  return { name: "Brote", next: 600 };
}

/* --------------------------- Reglas de inventario ---------------------------- */

export type StockLevel = "critico" | "resurtir" | "ok";

/** Un insumo entra en alerta cuando su existencia cae hasta el umbral. */
export function stockLevel(ing: Ingredient): StockLevel {
  if (ing.min <= 0) return "ok";
  if (ing.stock <= ing.min * 0.5) return "critico";
  if (ing.stock <= ing.min) return "resurtir";
  return "ok";
}

/** El umbral leído como porcentaje del nivel objetivo, si hay uno definido. */
export function thresholdPct(ing: Ingredient): number | null {
  if (!ing.parLevel || ing.parLevel <= 0) return null;
  return Math.round((ing.min / ing.parLevel) * 100);
}

/* -------------------------- Reglas de caducidad ------------------------------ */

/** Días que faltan para caducar. Negativo = ya caducó. */
export function daysUntil(expiresOn: string, todayKey: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(expiresOn) - toUtc(todayKey)) / 86_400_000);
}

export type ExpiryLevel = "caducado" | "critico" | "pronto" | "ok";

/**
 * El cliente pidió cuenta regresiva y alerta destacada el último día. Un lote
 * al que le queda un día o menos es crítico, y sigue marcado hasta que un
 * administrador lo atienda.
 */
export function expiryLevel(days: number): ExpiryLevel {
  if (days < 0) return "caducado";
  if (days <= 1) return "critico";
  if (days <= 3) return "pronto";
  return "ok";
}

export const EXPIRY_META: Record<
  ExpiryLevel,
  { label: string; tone: "danger" | "amber" | "matcha" }
> = {
  caducado: { label: "Caducado", tone: "danger" },
  critico: { label: "Último día", tone: "danger" },
  pronto: { label: "Por vencer", tone: "amber" },
  ok: { label: "En buen estado", tone: "matcha" },
};

/* ============================================================================
 * Histórico de ventas.
 *
 * El estado de la aplicación sólo carga los últimos días. Estos tipos
 * describen lo que devuelve la consulta aparte (`sales_history` en Postgres),
 * que sí recorre todas las ventas: la suma se hace en la base y al navegador
 * sólo llega el resumen más una página de tickets.
 * ========================================================================== */

/** Cómo se agrupan los periodos del histórico. */
export type HistoryBucket = "dia" | "semana" | "mes" | "ano";

/** Tickets por página de la lista del histórico. */
export const HISTORY_PAGE_SIZE = 50;

/**
 * Tope de tickets que devuelve una sola consulta. Lo impone también la función
 * de Postgres, así que ponerlo aquí evita el viaje perdido, no la protección.
 */
export const HISTORY_EXPORT_MAX = 5000;

export const HISTORY_BUCKETS: { id: HistoryBucket; label: string }[] = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "ano", label: "Año" },
];

/** Los mismos identificadores sueltos, para validar lo que llega de fuera. */
export const HISTORY_BUCKET_IDS: HistoryBucket[] = HISTORY_BUCKETS.map((b) => b.id);

/** Cifras de un conjunto de ventas: sirven para un periodo y para el total. */
export interface SalesTotals {
  /** Tickets que contaron como venta (los anulados van aparte). */
  tickets: number;
  /** Tickets anulados: se cuentan siempre, pero no suman dinero. */
  cancelados: number;
  units: number;
  /** Consumo a precio de lista, antes de descuento. */
  subtotal: number;
  /** Lo que se dejó de cobrar por descuentos. */
  discount: number;
  /** Propina, ya incluida en `total`. */
  tip: number;
  total: number;
  byPayment: Record<PaymentMethod, number>;
}

/** Un periodo del histórico (un día, una semana, un mes o un año). */
export interface SalesPeriod extends SalesTotals {
  /** Primer día operativo del periodo (YYYY-MM-DD). */
  key: string;
  /** Último día operativo del periodo (YYYY-MM-DD). */
  end: string;
}

export interface SalesHistoryLine {
  name: string;
  emoji: string;
  qty: number;
  amount: number;
}

/** Un ticket del histórico: lo justo para reconocerlo sin cargar todo. */
export interface SalesHistoryOrder {
  id: string;
  folio: number;
  createdAt: string;
  status: OrderStatus;
  payment: PaymentMethod;
  serviceMode: ServiceMode;
  subtotal: number;
  discountPct: number;
  discountLabel?: string;
  tip: number;
  total: number;
  units: number;
  customerName?: string;
  createdByName?: string;
  items: SalesHistoryLine[];
}

/** Producto más vendido del rango. `productId` es null si ya no está en el menú. */
export interface SalesHistoryProduct {
  productId: string | null;
  name: string;
  emoji: string;
  qty: number;
  revenue: number;
}

export interface SalesHistoryFilters {
  /** Día operativo inicial (YYYY-MM-DD). `null` = desde la primera venta. */
  from?: string | null;
  /** Día operativo final, incluido. `null` = hasta la última venta. */
  to?: string | null;
  bucket?: HistoryBucket;
  payment?: PaymentMethod | null;
  /** Mostrar los tickets anulados en la lista (el resumen siempre los cuenta). */
  includeCancelled?: boolean;
  limit?: number;
  offset?: number;
}

export interface SalesHistory {
  /** Zona horaria con la que se agruparon los periodos. */
  tz: string;
  bucket: HistoryBucket;
  from: string | null;
  to: string | null;
  /** Días de la primera y la última venta registradas, sin filtros de por medio. */
  firstSaleDay: string | null;
  lastSaleDay: string | null;
  totals: SalesTotals;
  periods: SalesPeriod[];
  orders: SalesHistoryOrder[];
  /** Tickets que caben en el rango: con esto pagina la lista. */
  orderCount: number;
  topProducts: SalesHistoryProduct[];
  limit: number;
  offset: number;
}
