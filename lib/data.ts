import "server-only";

import { dayKey } from "./format";
import { r2PublicBase, isR2Configured } from "./r2";
import { db, num } from "./supabase";
import type {
  CashClose,
  Category,
  Customer,
  ExtraOption,
  FeatureFlags,
  Ingredient,
  LineModifiers,
  MilkOption,
  Order,
  OrderExtraSnapshot,
  OrderItem,
  PreparedItem,
  Product,
  RecipeItem,
  Settings,
  Staff,
  AppState,
  Sweetness,
  Temperature,
} from "./types";
import type {
  CashCloseRow,
  CategoryRow,
  CustomerRow,
  ExtraRecipeItemRow,
  ExtraRow,
  IngredientRow,
  Json,
  MilkOptionRow,
  OrderItemRow,
  OrderRow,
  PreparedItemRow,
  ProductRecipeItemRow,
  ProductRow,
  SettingsRow,
} from "./database.types";
import { toStaff } from "./auth";

/* ============================================================================
 * Carga del estado de la aplicación.
 *
 * Un único punto de entrada, `loadAppState`, arma todo lo que los módulos
 * necesitan. Las ventanas de tiempo están acotadas a propósito: el panel usa
 * los últimos días, no el histórico completo, para que la aplicación siga
 * ligera cuando la cafetería lleve años de ventas.
 * ========================================================================== */

/** Días de ventas que se cargan al panel (7 para las gráficas + margen). */
const ORDER_WINDOW_DAYS = 9;
const CUSTOMER_LIMIT = 1000;
const CASH_CLOSE_LIMIT = 60;
const PREPARED_LIMIT = 200;

/* ------------------------------- Traductores -------------------------------- */

function toSettings(row: SettingsRow): Settings {
  return {
    businessName: row.business_name,
    branchName: row.branch_name,
    timezone: row.timezone,
    currency: row.currency,
    logoKey: row.logo_key,
    cashFloat: num(row.cash_float),
    pointsPerCurrency: num(row.points_per_currency, 1),
    rewardCost: Math.round(num(row.reward_cost, 500)),
    googleReviewUrl: row.google_review_url,
    googleRating: row.google_rating === null ? null : num(row.google_rating),
    googleReviewsCount:
      row.google_reviews_count === null
        ? null
        : Math.round(num(row.google_reviews_count)),
    catalogSeededAt: row.catalog_seeded_at,
  };
}

function toFlags(row: SettingsRow): FeatureFlags {
  return {
    inventario: row.flag_inventario,
    lealtad: row.flag_lealtad,
    resenasGoogle: row.flag_resenas_google,
    mercadoPago: row.flag_mercadopago,
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    label: row.label,
    emoji: row.emoji,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    stock: num(row.stock),
    min: num(row.min_stock),
    weeklyUse: num(row.weekly_use),
    isPackaging: row.is_packaging,
    parLevel: row.par_level === null ? null : num(row.par_level),
    active: row.active,
  };
}

function toPreparedItem(row: PreparedItemRow): PreparedItem {
  return {
    id: row.id,
    name: row.name,
    qty: num(row.qty),
    unit: row.unit,
    producedOn: row.produced_on,
    expiresOn: row.expires_on,
    notes: row.notes ?? "",
    acknowledgedAt: row.acknowledged_at,
    discardedAt: row.discarded_at,
  };
}

function toMilk(row: MilkOptionRow): MilkOption {
  return {
    id: row.id,
    name: row.name,
    surcharge: num(row.surcharge),
    ingredientId: row.ingredient_id,
    available: row.available,
    sortOrder: row.sort_order,
  };
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    notes: row.notes ?? "",
    points: row.points,
    visits: row.visits,
    cardToken: row.card_token,
    since: row.since,
    lastVisit: row.last_visit,
  };
}

function toCashClose(row: CashCloseRow): CashClose {
  return {
    id: row.id,
    dateKey: row.date_key,
    closedAt: row.closed_at,
    expectedCash: num(row.expected_cash),
    expectedCard: num(row.expected_card),
    countedCash: num(row.counted_cash),
    difference: num(row.difference),
    tipsCash: num(row.tips_cash),
    tipsTotal: num(row.tips_total),
    orders: row.orders_count,
    notes: row.notes ?? undefined,
    closedBy: row.closed_by_name || "Equipo",
  };
}

const SWEETNESS_VALUES: Sweetness[] = [0, 25, 50, 75, 100];

/** El JSON de `modifiers` viene de la base: se valida antes de confiar en él. */
function parseModifiers(raw: Json): LineModifiers {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const sweetnessRaw = Number(obj.sweetness);
  const sweetness = SWEETNESS_VALUES.includes(sweetnessRaw as Sweetness)
    ? (sweetnessRaw as Sweetness)
    : undefined;

  const temperature =
    obj.temperature === "caliente" || obj.temperature === "frio"
      ? (obj.temperature as Temperature)
      : undefined;

  const extras: OrderExtraSnapshot[] = Array.isArray(obj.extras)
    ? obj.extras.flatMap((e) => {
        if (!e || typeof e !== "object") return [];
        const item = e as Record<string, unknown>;
        return typeof item.id === "string" && typeof item.name === "string"
          ? [{ id: item.id, name: item.name, price: num(item.price) }]
          : [];
      })
    : [];

  const extraIds = Array.isArray(obj.extraIds)
    ? obj.extraIds.filter((id): id is string => typeof id === "string")
    : extras.map((e) => e.id);

  return {
    milkId: typeof obj.milkId === "string" ? obj.milkId : undefined,
    milkName: typeof obj.milkName === "string" ? obj.milkName : undefined,
    sweetness,
    temperature,
    extraIds,
    extras,
    notes:
      typeof obj.notes === "string" && obj.notes.trim() !== ""
        ? obj.notes
        : undefined,
  };
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    emoji: row.emoji,
    imageKey: row.image_key,
    qty: row.qty,
    unitPrice: num(row.unit_price),
    modsPrice: num(row.mods_price),
    modifiers: parseModifiers(row.modifiers),
  };
}

function toOrder(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    folio: row.folio,
    items,
    subtotal: num(row.subtotal),
    discountPct: num(row.discount_pct),
    discountLabel: row.discount_label ?? undefined,
    tip: num(row.tip),
    total: num(row.total),
    payment: row.payment,
    status: row.status,
    serviceMode: row.service_mode,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name ?? undefined,
    pointsEarned: row.points_earned ?? undefined,
    createdByName: row.created_by_name ?? undefined,
  };
}

/* --------------------------------- Consultas -------------------------------- */

export async function loadSettingsRow(): Promise<SettingsRow> {
  const supabase = db();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la configuración: ${error.message}`);

  if (!data) {
    // La fila única se crea en la migración; si falta, se restituye sola.
    const created = await supabase
      .from("settings")
      .insert({ id: 1 })
      .select("*")
      .single();
    if (created.error || !created.data) {
      throw new Error(
        `No se pudo crear la configuración: ${created.error?.message ?? "sin datos"}`,
      );
    }
    return created.data;
  }
  return data;
}

async function loadProducts(): Promise<Product[]> {
  const supabase = db();
  const [products, recipes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("product_recipe_items").select("*"),
  ]);

  if (products.error) {
    throw new Error(`No se pudieron leer los productos: ${products.error.message}`);
  }
  if (recipes.error) {
    throw new Error(`No se pudieron leer las recetas: ${recipes.error.message}`);
  }

  const byProduct = new Map<string, RecipeItem[]>();
  for (const row of (recipes.data ?? []) as ProductRecipeItemRow[]) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push({
      ingredientId: row.is_milk ? "milk" : (row.ingredient_id as string),
      qty: num(row.qty),
    });
    byProduct.set(row.product_id, list);
  }

  return ((products.data ?? []) as ProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: num(row.price),
    desc: row.description,
    emoji: row.emoji,
    imageKey: row.image_key,
    active: row.active,
    popular: row.popular,
    sortOrder: row.sort_order,
    recipe: byProduct.get(row.id) ?? [],
    mods: {
      milk: row.mod_milk,
      sweetness: row.mod_sweetness,
      temperature: row.mod_temperature,
      extras: row.mod_extras,
    },
  }));
}

async function loadExtras(): Promise<ExtraOption[]> {
  const supabase = db();
  const [extras, recipes] = await Promise.all([
    supabase
      .from("extras")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("extra_recipe_items").select("*"),
  ]);

  if (extras.error) {
    throw new Error(`No se pudieron leer los extras: ${extras.error.message}`);
  }
  if (recipes.error) {
    throw new Error(`No se pudieron leer las recetas: ${recipes.error.message}`);
  }

  const byExtra = new Map<string, RecipeItem[]>();
  for (const row of (recipes.data ?? []) as ExtraRecipeItemRow[]) {
    const list = byExtra.get(row.extra_id) ?? [];
    list.push({ ingredientId: row.ingredient_id, qty: num(row.qty) });
    byExtra.set(row.extra_id, list);
  }

  return ((extras.data ?? []) as ExtraRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    price: num(row.price),
    recipe: byExtra.get(row.id) ?? [],
    available: row.available,
    sortOrder: row.sort_order,
  }));
}

async function loadOrders(): Promise<Order[]> {
  const supabase = db();
  const since = new Date(
    Date.now() - ORDER_WINDOW_DAYS * 86_400_000,
  ).toISOString();

  // Dos consultas en vez de un `or` complejo: las comandas abiertas se cargan
  // siempre, aunque sean de un turno anterior que quedó sin entregar.
  const [recent, active] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select("*")
      .in("status", ["nuevo", "preparando", "listo"])
      .order("created_at", { ascending: true }),
  ]);

  if (recent.error) {
    throw new Error(`No se pudieron leer las ventas: ${recent.error.message}`);
  }
  if (active.error) {
    throw new Error(`No se pudieron leer las comandas: ${active.error.message}`);
  }

  const rows = new Map<string, OrderRow>();
  for (const row of [
    ...((recent.data ?? []) as OrderRow[]),
    ...((active.data ?? []) as OrderRow[]),
  ]) {
    rows.set(row.id, row);
  }
  if (rows.size === 0) return [];

  const items = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", [...rows.keys()])
    .order("line_no", { ascending: true });

  if (items.error) {
    throw new Error(`No se pudieron leer los renglones: ${items.error.message}`);
  }

  const byOrder = new Map<string, OrderItem[]>();
  for (const row of (items.data ?? []) as OrderItemRow[]) {
    const list = byOrder.get(row.order_id) ?? [];
    list.push(toOrderItem(row));
    byOrder.set(row.order_id, list);
  }

  return [...rows.values()]
    .map((row) => toOrder(row, byOrder.get(row.id) ?? []))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* -------------------------------- Estado total ------------------------------- */

export async function loadAppState(me: Staff): Promise<AppState> {
  const supabase = db();

  const settingsRow = await loadSettingsRow();

  const [
    ingredients,
    milks,
    extras,
    categories,
    products,
    customers,
    orders,
    cashCloses,
    preparedItems,
    staffRows,
  ] = await Promise.all([
    supabase
      .from("ingredients")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("milk_options")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    loadExtras(),
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    loadProducts(),
    supabase
      .from("customers")
      .select("*")
      .eq("active", true)
      .order("last_visit", { ascending: false, nullsFirst: false })
      .limit(CUSTOMER_LIMIT),
    loadOrders(),
    supabase
      .from("cash_closes")
      .select("*")
      .order("date_key", { ascending: false })
      .limit(CASH_CLOSE_LIMIT),
    // Los lotes desechados salen de la vista; el resto se ordena por urgencia.
    supabase
      .from("prepared_items")
      .select("*")
      .is("discarded_at", null)
      .order("expires_on", { ascending: true })
      .limit(PREPARED_LIMIT),
    // Los datos del equipo (correos incluidos) sólo se envían a administradores.
    me.role === "admin"
      ? supabase
          .from("staff")
          .select("*")
          .order("active", { ascending: false })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (ingredients.error) {
    throw new Error(`No se pudieron leer los insumos: ${ingredients.error.message}`);
  }
  if (milks.error) {
    throw new Error(`No se pudieron leer las leches: ${milks.error.message}`);
  }
  if (categories.error) {
    throw new Error(
      `No se pudieron leer las categorías: ${categories.error.message}`,
    );
  }
  if (customers.error) {
    throw new Error(`No se pudieron leer los clientes: ${customers.error.message}`);
  }
  if (cashCloses.error) {
    throw new Error(`No se pudieron leer los cortes: ${cashCloses.error.message}`);
  }
  if (preparedItems.error) {
    throw new Error(
      `No se pudieron leer los productos preparados: ${preparedItems.error.message}`,
    );
  }
  if (staffRows.error) {
    throw new Error(`No se pudo leer el equipo: ${staffRows.error.message}`);
  }

  const settings = toSettings(settingsRow);

  return {
    loadedAt: new Date().toISOString(),
    todayKey: dayKey(new Date(), settings.timezone),
    me,
    role: me.role,
    settings,
    flags: toFlags(settingsRow),
    staff: staffRows.data ? staffRows.data.map(toStaff) : [me],
    categories: ((categories.data ?? []) as CategoryRow[]).map(toCategory),
    products,
    ingredients: ((ingredients.data ?? []) as IngredientRow[]).map(toIngredient),
    milks: ((milks.data ?? []) as MilkOptionRow[]).map(toMilk),
    extras,
    orders,
    customers: ((customers.data ?? []) as CustomerRow[]).map(toCustomer),
    preparedItems: ((preparedItems.data ?? []) as PreparedItemRow[]).map(
      toPreparedItem,
    ),
    cashCloses: ((cashCloses.data ?? []) as CashCloseRow[]).map(toCashClose),
    media: { configured: isR2Configured(), publicBase: r2PublicBase() },
  };
}
