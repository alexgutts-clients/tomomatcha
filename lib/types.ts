/* ============================================================================
 * Tipos de dominio de TomoMatcha.
 *
 * Son la forma en que la aplicación (servidor y cliente) ve los datos; la capa
 * `lib/data.ts` los construye a partir de las filas de Supabase.
 * ========================================================================== */

export type Role = "admin" | "empleado";

export type CategoryId = "matcha" | "cafe" | "te" | "bakery";

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
  customerId?: string;
  cashReceived?: number;
}

export const CATEGORY_META: Record<
  CategoryId,
  { label: string; emoji: string }
> = {
  matcha: { label: "Matcha", emoji: "🍵" },
  cafe: { label: "Café", emoji: "☕" },
  te: { label: "Té e infusiones", emoji: "🫖" },
  bakery: { label: "Bakery", emoji: "🥐" },
};

export const CATEGORY_IDS = Object.keys(CATEGORY_META) as CategoryId[];

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
