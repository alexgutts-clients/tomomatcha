import {
  CashClose,
  Customer,
  DemoState,
  ExtraOption,
  Ingredient,
  MilkOption,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  Review,
  Sweetness,
  pointsFor,
} from "./types";
import { dayKey } from "./format";

export const STATE_VERSION = 3;

/* ---------------------------------- Insumos --------------------------------- */

const ingredients: Ingredient[] = [
  { id: "matcha-ceremonial", name: "Matcha ceremonial (Uji)", unit: "g", stock: 180, min: 200, weeklyUse: 320 },
  { id: "matcha-latte", name: "Matcha grado latte", unit: "g", stock: 640, min: 250, weeklyUse: 480 },
  { id: "hojicha", name: "Hojicha en polvo", unit: "g", stock: 210, min: 120, weeklyUse: 160 },
  { id: "cafe-grano", name: "Café en grano (Chiapas)", unit: "g", stock: 2400, min: 1000, weeklyUse: 2800 },
  { id: "te-sencha", name: "Té verde sencha", unit: "g", stock: 300, min: 100, weeklyUse: 90 },
  { id: "te-jazmin", name: "Té de jazmín", unit: "g", stock: 260, min: 100, weeklyUse: 70 },
  { id: "chai-mezcla", name: "Mezcla chai especiada", unit: "g", stock: 145, min: 150, weeklyUse: 210 },
  { id: "leche-entera", name: "Leche entera", unit: "ml", stock: 14200, min: 6000, weeklyUse: 22000 },
  { id: "leche-deslactosada", name: "Leche deslactosada", unit: "ml", stock: 5100, min: 3000, weeklyUse: 6500 },
  { id: "leche-avena", name: "Leche de avena", unit: "ml", stock: 2600, min: 3000, weeklyUse: 9000 },
  { id: "leche-almendra", name: "Leche de almendra", unit: "ml", stock: 3800, min: 2000, weeklyUse: 4200 },
  { id: "jarabe-natural", name: "Jarabe natural", unit: "ml", stock: 1900, min: 800, weeklyUse: 2300 },
  { id: "jarabe-vainilla", name: "Jarabe de vainilla", unit: "ml", stock: 950, min: 500, weeklyUse: 1100 },
  { id: "miel-agave", name: "Miel de agave", unit: "ml", stock: 700, min: 400, weeklyUse: 600 },
  { id: "yuzu", name: "Concentrado de yuzu", unit: "ml", stock: 420, min: 300, weeklyUse: 500 },
  { id: "fresa", name: "Puré de fresa", unit: "ml", stock: 1150, min: 500, weeklyUse: 900 },
  { id: "crema-batida", name: "Crema batida", unit: "g", stock: 800, min: 300, weeklyUse: 650 },
  { id: "hielo", name: "Hielo", unit: "g", stock: 24000, min: 8000, weeklyUse: 30000 },
  { id: "vaso-12", name: "Vaso 12 oz + tapa", unit: "pza", stock: 340, min: 150, weeklyUse: 420 },
  { id: "vaso-16", name: "Vaso 16 oz + tapa", unit: "pza", stock: 96, min: 120, weeklyUse: 380 },
  { id: "croissant-pza", name: "Croissant mantequilla (congelado)", unit: "pza", stock: 18, min: 8, weeklyUse: 40 },
  { id: "pan-matcha-pza", name: "Panqué de matcha (rebanada)", unit: "pza", stock: 11, min: 6, weeklyUse: 30 },
  { id: "cheesecake-pza", name: "Cheesecake de matcha (rebanada)", unit: "pza", stock: 7, min: 4, weeklyUse: 22 },
  { id: "galleta-pza", name: "Galleta chocolate-miso", unit: "pza", stock: 3, min: 6, weeklyUse: 45 },
  { id: "concha-pza", name: "Concha de vainilla", unit: "pza", stock: 14, min: 6, weeklyUse: 28 },
  { id: "banana-pza", name: "Banana bread (rebanada)", unit: "pza", stock: 9, min: 5, weeklyUse: 25 },
];

/* ------------------------------ Leches y extras ------------------------------ */

const milks: MilkOption[] = [
  { id: "entera", name: "Entera", surcharge: 0, ingredientId: "leche-entera", available: true },
  { id: "deslactosada", name: "Deslactosada", surcharge: 0, ingredientId: "leche-deslactosada", available: true },
  { id: "avena", name: "Avena", surcharge: 10, ingredientId: "leche-avena", available: true },
  { id: "almendra", name: "Almendra", surcharge: 10, ingredientId: "leche-almendra", available: true },
  { id: "sin-leche", name: "Sin leche (en agua)", surcharge: 0, ingredientId: null, available: true },
];

const extras: ExtraOption[] = [
  { id: "shot-espresso", name: "Shot extra de espresso", price: 15, recipe: [{ ingredientId: "cafe-grano", qty: 18 }], available: true },
  { id: "matcha-extra", name: "Gramo extra de matcha", price: 12, recipe: [{ ingredientId: "matcha-latte", qty: 2 }], available: true },
  { id: "vainilla", name: "Shot de vainilla", price: 8, recipe: [{ ingredientId: "jarabe-vainilla", qty: 15 }], available: true },
  { id: "agave", name: "Miel de agave", price: 8, recipe: [{ ingredientId: "miel-agave", qty: 15 }], available: true },
  { id: "crema", name: "Crema batida", price: 10, recipe: [{ ingredientId: "crema-batida", qty: 25 }], available: true },
];

/* --------------------------------- Productos --------------------------------- */

const DRINK = { milk: true, sweetness: true, temperature: true, extras: true };
const TEA = { milk: false, sweetness: true, temperature: true, extras: false };
const FOOD = { milk: false, sweetness: false, temperature: false, extras: false };

const products: Product[] = [
  // Matcha
  { id: "matcha-latte", name: "Matcha Latte", category: "matcha", price: 95, emoji: "🍵", popular: true, active: true, desc: "Matcha grado latte batido con leche cremosa.", mods: DRINK, recipe: [{ ingredientId: "matcha-latte", qty: 4 }, { ingredientId: "milk", qty: 240 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "iced-matcha", name: "Iced Matcha", category: "matcha", price: 98, emoji: "🧊", popular: true, active: true, desc: "Matcha frío sobre hielo, refrescante y vibrante.", mods: DRINK, recipe: [{ ingredientId: "matcha-latte", qty: 4 }, { ingredientId: "milk", qty: 200 }, { ingredientId: "hielo", qty: 140 }, { ingredientId: "vaso-16", qty: 1 }] },
  { id: "dirty-matcha", name: "Dirty Matcha", category: "matcha", price: 110, emoji: "🌗", popular: true, active: true, desc: "Matcha latte con shot de espresso encima.", mods: DRINK, recipe: [{ ingredientId: "matcha-latte", qty: 4 }, { ingredientId: "cafe-grano", qty: 18 }, { ingredientId: "milk", qty: 220 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "matcha-ceremonial", name: "Matcha Ceremonial (Usucha)", category: "matcha", price: 85, emoji: "🌿", active: true, desc: "Matcha Uji batido en agua, servicio tradicional.", mods: { milk: false, sweetness: false, temperature: false, extras: false }, recipe: [{ ingredientId: "matcha-ceremonial", qty: 2 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "matcha-fresa", name: "Matcha Fresa", category: "matcha", price: 105, emoji: "🍓", popular: true, active: true, desc: "Capas de puré de fresa, leche y matcha frío.", mods: DRINK, recipe: [{ ingredientId: "matcha-latte", qty: 3 }, { ingredientId: "fresa", qty: 60 }, { ingredientId: "milk", qty: 180 }, { ingredientId: "hielo", qty: 120 }, { ingredientId: "vaso-16", qty: 1 }] },
  { id: "matcha-yuzu", name: "Matcha Yuzu Lemonade", category: "matcha", price: 99, emoji: "🍋", active: true, desc: "Limonada de yuzu coronada con matcha frío.", mods: { milk: false, sweetness: true, temperature: false, extras: false }, recipe: [{ ingredientId: "matcha-latte", qty: 3 }, { ingredientId: "yuzu", qty: 40 }, { ingredientId: "hielo", qty: 150 }, { ingredientId: "vaso-16", qty: 1 }] },
  { id: "hojicha-latte", name: "Hojicha Latte", category: "matcha", price: 92, emoji: "🍂", active: true, desc: "Té verde tostado, notas de caramelo y humo.", mods: DRINK, recipe: [{ ingredientId: "hojicha", qty: 4 }, { ingredientId: "milk", qty: 240 }, { ingredientId: "vaso-12", qty: 1 }] },
  // Café
  { id: "espresso", name: "Espresso", category: "cafe", price: 45, emoji: "☕", active: true, desc: "Doble shot de origen Chiapas.", mods: { milk: false, sweetness: false, temperature: false, extras: true }, recipe: [{ ingredientId: "cafe-grano", qty: 18 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "americano", name: "Americano", category: "cafe", price: 52, emoji: "🫘", active: true, desc: "Espresso alargado con agua caliente.", mods: { milk: false, sweetness: true, temperature: true, extras: true }, recipe: [{ ingredientId: "cafe-grano", qty: 18 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "latte", name: "Latte", category: "cafe", price: 70, emoji: "🥛", popular: true, active: true, desc: "Espresso con leche vaporizada y microespuma.", mods: DRINK, recipe: [{ ingredientId: "cafe-grano", qty: 18 }, { ingredientId: "milk", qty: 240 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "capuchino", name: "Capuchino", category: "cafe", price: 68, emoji: "☁️", active: true, desc: "Partes iguales de espresso, leche y espuma.", mods: DRINK, recipe: [{ ingredientId: "cafe-grano", qty: 18 }, { ingredientId: "milk", qty: 180 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "flat-white", name: "Flat White", category: "cafe", price: 74, emoji: "🤍", active: true, desc: "Doble shot con leche sedosa, intenso y corto.", mods: DRINK, recipe: [{ ingredientId: "cafe-grano", qty: 36 }, { ingredientId: "milk", qty: 160 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "cold-brew", name: "Cold Brew", category: "cafe", price: 72, emoji: "🧋", active: true, desc: "Extracción en frío 16 h, servido sobre hielo.", mods: { milk: true, sweetness: true, temperature: false, extras: true }, recipe: [{ ingredientId: "cafe-grano", qty: 30 }, { ingredientId: "hielo", qty: 150 }, { ingredientId: "vaso-16", qty: 1 }] },
  // Té
  { id: "sencha", name: "Té Verde Sencha", category: "te", price: 58, emoji: "🫖", active: true, desc: "Infusión ligera de hoja entera japonesa.", mods: TEA, recipe: [{ ingredientId: "te-sencha", qty: 5 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "jazmin", name: "Té de Jazmín", category: "te", price: 58, emoji: "🌸", active: true, desc: "Té verde perfumado con flor de jazmín.", mods: TEA, recipe: [{ ingredientId: "te-jazmin", qty: 5 }, { ingredientId: "vaso-12", qty: 1 }] },
  { id: "chai-latte", name: "Chai Latte", category: "te", price: 78, emoji: "🫚", active: true, desc: "Especias dulces con leche vaporizada.", mods: DRINK, recipe: [{ ingredientId: "chai-mezcla", qty: 8 }, { ingredientId: "milk", qty: 240 }, { ingredientId: "vaso-12", qty: 1 }] },
  // Bakery
  { id: "croissant", name: "Croissant de Mantequilla", category: "bakery", price: 55, emoji: "🥐", popular: true, active: true, desc: "Hojaldrado, horneado en casa cada mañana.", mods: FOOD, recipe: [{ ingredientId: "croissant-pza", qty: 1 }] },
  { id: "pan-matcha", name: "Panqué de Matcha", category: "bakery", price: 62, emoji: "🍰", active: true, desc: "Húmedo, con glaseado de chocolate blanco.", mods: FOOD, recipe: [{ ingredientId: "pan-matcha-pza", qty: 1 }] },
  { id: "cheesecake-matcha", name: "Cheesecake de Matcha", category: "bakery", price: 88, emoji: "🍮", active: true, desc: "Estilo japonés, ligero y cremoso.", mods: FOOD, recipe: [{ ingredientId: "cheesecake-pza", qty: 1 }] },
  { id: "galleta-miso", name: "Galleta Chocolate & Miso", category: "bakery", price: 48, emoji: "🍪", active: true, desc: "Dulce-salada, crujiente por fuera.", mods: FOOD, recipe: [{ ingredientId: "galleta-pza", qty: 1 }] },
  { id: "concha", name: "Concha de Vainilla", category: "bakery", price: 42, emoji: "🐚", active: true, desc: "Clásica mexicana, esponjosa.", mods: FOOD, recipe: [{ ingredientId: "concha-pza", qty: 1 }] },
  { id: "banana-bread", name: "Banana Bread", category: "bakery", price: 58, emoji: "🍌", active: true, desc: "Con nuez tostada y canela.", mods: FOOD, recipe: [{ ingredientId: "banana-pza", qty: 1 }] },
];

/* --------------------------------- Clientes --------------------------------- */

const customers: Customer[] = [
  { id: "c1", name: "Ana Sofía Torres", phone: "55 1234 0101", email: "ana.demo@ejemplo.mx", points: 1680, visits: 42, since: "2025-03-12", lastVisit: "" },
  { id: "c2", name: "Luis Méndez", phone: "55 1234 0102", email: "luis.demo@ejemplo.mx", points: 940, visits: 25, since: "2025-06-02", lastVisit: "" },
  { id: "c3", name: "Regina Salas", phone: "55 1234 0103", email: "regina.demo@ejemplo.mx", points: 720, visits: 18, since: "2025-08-21", lastVisit: "" },
  { id: "c4", name: "Marco Antonio Ruiz", phone: "55 1234 0104", email: "marco.demo@ejemplo.mx", points: 455, visits: 12, since: "2025-11-05", lastVisit: "" },
  { id: "c5", name: "Fernanda Ibáñez", phone: "55 1234 0105", email: "fer.demo@ejemplo.mx", points: 380, visits: 9, since: "2026-01-18", lastVisit: "" },
  { id: "c6", name: "Diego Carrillo", phone: "55 1234 0106", email: "diego.demo@ejemplo.mx", points: 210, visits: 6, since: "2026-04-02", lastVisit: "" },
  { id: "c7", name: "Paola Vega", phone: "55 1234 0107", email: "paola.demo@ejemplo.mx", points: 95, visits: 3, since: "2026-06-27", lastVisit: "" },
  { id: "c8", name: "Emilio Zárate", phone: "55 1234 0108", email: "emilio.demo@ejemplo.mx", points: 40, visits: 1, since: "2026-07-30", lastVisit: "" },
];

/* --------------------------------- Reseñas ---------------------------------- */

const reviews: Review[] = [
  { id: "r1", author: "Valeria G.", rating: 5, text: "El mejor matcha latte de la zona, la leche de avena queda perfecta. El lugar es precioso.", date: "hace 2 días" },
  { id: "r2", author: "Andrés P.", rating: 5, text: "Pedí el Dirty Matcha y me cambió la vida. Servicio rápido aunque estaba lleno.", date: "hace 5 días" },
  { id: "r3", author: "Sofía M.", rating: 4, text: "Muy rico todo, el cheesecake de matcha espectacular. Solo faltó lugar para sentarse.", date: "hace 1 semana" },
  { id: "r4", author: "Jorge L.", rating: 5, text: "Café de especialidad de verdad y el personal súper amable. La concha con matcha, sorpresa total.", date: "hace 2 semanas" },
];

/* ------------------------- Generador de historial demo ------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MILK_POOL = ["entera", "entera", "avena", "avena", "deslactosada", "almendra"];
const PAY_POOL: PaymentMethod[] = ["efectivo", "tarjeta", "mercadopago", "mercadopago", "tarjeta", "efectivo", "mercadopago"];
const SWEET_POOL: Sweetness[] = [0, 25, 50, 50, 75, 100];

function buildItem(product: Product, rnd: () => number, milkList: MilkOption[]): OrderItem {
  const milkId = product.mods.milk ? MILK_POOL[Math.floor(rnd() * MILK_POOL.length)] : undefined;
  const milk = milkList.find((m) => m.id === milkId);
  return {
    productId: product.id,
    name: product.name,
    emoji: product.emoji,
    qty: rnd() > 0.85 ? 2 : 1,
    unitPrice: product.price,
    modsPrice: milk?.surcharge ?? 0,
    modifiers: {
      milkId,
      sweetness: product.mods.sweetness ? SWEET_POOL[Math.floor(rnd() * SWEET_POOL.length)] : undefined,
      temperature: product.mods.temperature ? (rnd() > 0.55 ? "caliente" : "frio") : undefined,
      extraIds: [],
    },
  };
}

interface History {
  orders: Order[];
  cashCloses: CashClose[];
  customers: Customer[];
  nextFolio: number;
}

function generateHistory(): History {
  const rnd = mulberry32(20260811);
  const orders: Order[] = [];
  const cashCloses: CashClose[] = [];
  const custs = customers.map((c) => ({ ...c }));
  const activeProducts = products.filter((p) => p.active);
  let folio = 1001;

  const now = new Date();

  for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
    const day = new Date(now);
    day.setDate(now.getDate() - daysAgo);
    const isToday = daysAgo === 0;
    // Día actual: solo pedidos de la mañana hasta "ahora"
    const count = isToday ? 9 : 11 + Math.floor(rnd() * 8);
    let dayCash = 0;
    let dayCard = 0;

    for (let i = 0; i < count; i++) {
      const created = new Date(day);
      if (isToday) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const startMin = 8 * 60;
        const span = Math.max(45, nowMin - startMin);
        created.setHours(8, Math.floor((span / count) * i + rnd() * 12), Math.floor(rnd() * 60), 0);
      } else {
        created.setHours(8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), Math.floor(rnd() * 60), 0);
      }

      const nItems = rnd() > 0.6 ? 2 : rnd() > 0.85 ? 3 : 1;
      const items: OrderItem[] = [];
      for (let k = 0; k < nItems; k++) {
        // sesgo hacia productos populares
        const pool = rnd() > 0.4 ? activeProducts.filter((p) => p.popular) : activeProducts;
        const product = pool[Math.floor(rnd() * pool.length)] ?? activeProducts[0];
        items.push(buildItem(product, rnd, milks));
      }

      const subtotal = items.reduce((s, it) => s + (it.unitPrice + it.modsPrice) * it.qty, 0);
      const discountPct = rnd() > 0.92 ? 10 : 0;
      const total = Math.round(subtotal * (1 - discountPct / 100));
      const payment = PAY_POOL[Math.floor(rnd() * PAY_POOL.length)];

      const withCustomer = rnd() > 0.55;
      const customer = withCustomer ? custs[Math.floor(rnd() * custs.length)] : undefined;
      const iso = created.toISOString();

      // Los últimos 3 pedidos de hoy quedan activos para el tablero de comandas
      const isActive = isToday && i >= count - 3;
      const status = isActive ? (["nuevo", "preparando", "listo"] as const)[count - 1 - i] : "entregado";

      if (customer) {
        customer.lastVisit = iso;
      }

      orders.push({
        id: `seed-${folio}`,
        folio,
        items,
        subtotal,
        discountPct,
        discountLabel: discountPct ? "Promo demo 10%" : undefined,
        total,
        payment,
        status,
        createdAt: iso,
        deliveredAt: status === "entregado" ? new Date(created.getTime() + 6 * 60000).toISOString() : undefined,
        customerId: customer?.id,
        customerName: customer?.name,
        pointsEarned: customer ? pointsFor(total) : undefined,
      });
      folio++;

      if (status === "entregado") {
        if (payment === "efectivo") dayCash += total;
        else dayCard += total;
      }
    }

    if (!isToday) {
      const diff = rnd() > 0.7 ? -Math.floor(rnd() * 40) : 0;
      const closedAt = new Date(day);
      closedAt.setHours(19, 5, 0, 0);
      cashCloses.push({
        id: `close-${dayKey(day.toISOString())}`,
        dateKey: dayKey(day.toISOString()),
        closedAt: closedAt.toISOString(),
        expectedCash: dayCash,
        expectedCard: dayCard,
        countedCash: dayCash + diff,
        difference: diff,
        orders: count,
        notes: diff ? "Diferencia por cambio mal entregado (demo)." : undefined,
        closedBy: "Administrador demo",
      });
    }
  }

  // Clientes sin lastVisit: asignar fecha plausible
  custs.forEach((c, i) => {
    if (!c.lastVisit) {
      const d = new Date(now);
      d.setDate(now.getDate() - (i + 2));
      d.setHours(12, 30, 0, 0);
      c.lastVisit = d.toISOString();
    }
  });

  return { orders, cashCloses, customers: custs, nextFolio: folio };
}

/* --------------------------------- Estado ----------------------------------- */

export function buildSeedState(): DemoState {
  const history = generateHistory();
  return {
    version: STATE_VERSION,
    seededAt: new Date().toISOString(),
    role: "admin",
    flags: { inventario: true, lealtad: true, resenasGoogle: true, mercadoPago: true },
    products: products.map((p) => ({ ...p, recipe: [...p.recipe], mods: { ...p.mods } })),
    ingredients: ingredients.map((i) => ({ ...i })),
    milks: milks.map((m) => ({ ...m })),
    extras: extras.map((e) => ({ ...e, recipe: [...e.recipe] })),
    orders: history.orders,
    customers: history.customers,
    cashCloses: history.cashCloses,
    reviews: reviews.map((r) => ({ ...r })),
    nextFolio: history.nextFolio,
  };
}
