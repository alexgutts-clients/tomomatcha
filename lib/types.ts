export type Role = "admin" | "empleado";

export type CategoryId = "matcha" | "cafe" | "te" | "bakery";

export type Unit = "g" | "ml" | "pza";

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  stock: number;
  min: number;
  /** Consumo típico semanal, solo informativo para la demo */
  weeklyUse: number;
}

export interface RecipeItem {
  /** `"milk"` se resuelve al ingrediente de la leche elegida en el POS */
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
  active: boolean;
  popular?: boolean;
  recipe: RecipeItem[];
  mods: ModifierSupport;
}

export interface MilkOption {
  id: string;
  name: string;
  surcharge: number;
  ingredientId: string | null;
  available: boolean;
}

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
  recipe: RecipeItem[];
  available: boolean;
}

export type Sweetness = 0 | 25 | 50 | 75 | 100;
export type Temperature = "caliente" | "frio";

export interface LineModifiers {
  milkId?: string;
  sweetness?: Sweetness;
  temperature?: Temperature;
  extraIds: string[];
  notes?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  emoji: string;
  qty: number;
  unitPrice: number;
  /** Cargo adicional por leche/extras, por unidad */
  modsPrice: number;
  modifiers: LineModifiers;
}

export type OrderStatus = "nuevo" | "preparando" | "listo" | "entregado";

export type PaymentMethod = "efectivo" | "tarjeta" | "mercadopago";

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
  createdAt: string;
  deliveredAt?: string;
  customerId?: string;
  customerName?: string;
  pointsEarned?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  visits: number;
  since: string;
  lastVisit: string;
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

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface DemoState {
  version: number;
  seededAt: string;
  role: Role;
  flags: FeatureFlags;
  products: Product[];
  ingredients: Ingredient[];
  milks: MilkOption[];
  extras: ExtraOption[];
  orders: Order[];
  customers: Customer[];
  cashCloses: CashClose[];
  reviews: Review[];
  nextFolio: number;
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
  customerId?: string;
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
};

export const PAYMENT_META: Record<PaymentMethod, { label: string; short: string }> = {
  efectivo: { label: "Efectivo", short: "Efectivo" },
  tarjeta: { label: "Tarjeta (demo)", short: "Tarjeta" },
  mercadopago: { label: "Mercado Pago · simulado", short: "Mercado Pago" },
};

export const SWEETNESS_STEPS: Sweetness[] = [0, 25, 50, 75, 100];

/** Puntos de lealtad ganados por compra: 1 punto por peso */
export function pointsFor(total: number): number {
  return Math.round(total);
}

export function loyaltyTier(points: number): {
  name: string;
  next: number | null;
} {
  if (points >= 1500) return { name: "Ceremonial", next: null };
  if (points >= 600) return { name: "Hoja", next: 1500 };
  return { name: "Brote", next: 600 };
}
