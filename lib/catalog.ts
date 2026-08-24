/* ============================================================================
 * Catálogo inicial sugerido.
 *
 * NO son datos de prueba: la base arranca vacía y este catálogo sólo se inserta
 * si un administrador lo pide expresamente desde Ajustes, para no tener que
 * teclear 25 insumos y 22 productos a mano el primer día.
 *
 * El stock arranca en 0 a propósito — el inventario real se captura contando la
 * barra, no adivinando. Los mínimos sí vienen sugeridos.
 * ========================================================================== */

import type { CategoryId, Unit } from "./types";

export interface CatalogIngredient {
  slug: string;
  name: string;
  unit: Unit;
  min: number;
  weeklyUse: number;
  /** Empaque: sólo se descuenta cuando el pedido se cobra «para llevar». */
  packaging?: boolean;
}

export interface CatalogMilk {
  slug: string;
  name: string;
  surcharge: number;
  ingredient: string | null;
}

export interface CatalogExtra {
  slug: string;
  name: string;
  price: number;
  recipe: { ingredient: string; qty: number }[];
}

export interface CatalogProduct {
  name: string;
  category: CategoryId;
  price: number;
  desc: string;
  emoji: string;
  popular?: boolean;
  mods: {
    milk: boolean;
    sweetness: boolean;
    temperature: boolean;
    extras: boolean;
  };
  recipe: { ingredient: string | "milk"; qty: number }[];
}

const DRINK = { milk: true, sweetness: true, temperature: true, extras: true };
/** Bebidas que sólo existen frías: sin selector de temperatura */
const COLD = { milk: true, sweetness: true, temperature: false, extras: true };
const TEA = { milk: false, sweetness: true, temperature: true, extras: false };
const FOOD = { milk: false, sweetness: false, temperature: false, extras: false };

export const CATALOG_INGREDIENTS: CatalogIngredient[] = [
  { slug: "matcha-ceremonial", name: "Matcha ceremonial (Uji)", unit: "g", min: 200, weeklyUse: 320 },
  { slug: "matcha-latte", name: "Matcha grado latte", unit: "g", min: 250, weeklyUse: 480 },
  { slug: "hojicha", name: "Hojicha en polvo", unit: "g", min: 120, weeklyUse: 160 },
  { slug: "cafe-grano", name: "Café en grano", unit: "g", min: 1000, weeklyUse: 2800 },
  { slug: "te-sencha", name: "Té verde sencha", unit: "g", min: 100, weeklyUse: 90 },
  { slug: "te-jazmin", name: "Té de jazmín", unit: "g", min: 100, weeklyUse: 70 },
  { slug: "chai-mezcla", name: "Mezcla chai especiada", unit: "g", min: 150, weeklyUse: 210 },
  { slug: "leche-entera", name: "Leche entera", unit: "ml", min: 6000, weeklyUse: 22000 },
  { slug: "leche-deslactosada", name: "Leche deslactosada", unit: "ml", min: 3000, weeklyUse: 6500 },
  { slug: "leche-avena", name: "Leche de avena", unit: "ml", min: 3000, weeklyUse: 9000 },
  { slug: "leche-almendra", name: "Leche de almendra", unit: "ml", min: 2000, weeklyUse: 4200 },
  { slug: "jarabe-natural", name: "Jarabe natural", unit: "ml", min: 800, weeklyUse: 2300 },
  { slug: "jarabe-vainilla", name: "Jarabe de vainilla", unit: "ml", min: 500, weeklyUse: 1100 },
  { slug: "miel-agave", name: "Miel de agave", unit: "ml", min: 400, weeklyUse: 600 },
  { slug: "yuzu", name: "Concentrado de yuzu", unit: "ml", min: 300, weeklyUse: 500 },
  { slug: "fresa", name: "Puré de fresa", unit: "ml", min: 500, weeklyUse: 900 },
  { slug: "crema-batida", name: "Crema batida", unit: "g", min: 300, weeklyUse: 650 },
  { slug: "hielo", name: "Hielo", unit: "g", min: 8000, weeklyUse: 30000 },
  { slug: "vaso-12", name: "Vaso 12 oz + tapa", unit: "pza", min: 150, weeklyUse: 420, packaging: true },
  { slug: "vaso-16", name: "Vaso 16 oz + tapa", unit: "pza", min: 120, weeklyUse: 380, packaging: true },
  { slug: "croissant-pza", name: "Croissant de mantequilla", unit: "pza", min: 8, weeklyUse: 40 },
  { slug: "pan-matcha-pza", name: "Panqué de matcha (rebanada)", unit: "pza", min: 6, weeklyUse: 30 },
  { slug: "cheesecake-pza", name: "Cheesecake de matcha (rebanada)", unit: "pza", min: 4, weeklyUse: 22 },
  { slug: "galleta-pza", name: "Galleta chocolate-miso", unit: "pza", min: 6, weeklyUse: 45 },
  { slug: "concha-pza", name: "Concha de vainilla", unit: "pza", min: 6, weeklyUse: 28 },
  { slug: "banana-pza", name: "Banana bread (rebanada)", unit: "pza", min: 5, weeklyUse: 25 },
];

export const CATALOG_MILKS: CatalogMilk[] = [
  { slug: "entera", name: "Entera", surcharge: 0, ingredient: "leche-entera" },
  { slug: "deslactosada", name: "Deslactosada", surcharge: 0, ingredient: "leche-deslactosada" },
  { slug: "avena", name: "Avena", surcharge: 10, ingredient: "leche-avena" },
  { slug: "almendra", name: "Almendra", surcharge: 10, ingredient: "leche-almendra" },
  { slug: "sin-leche", name: "Sin leche (en agua)", surcharge: 0, ingredient: null },
];

export const CATALOG_EXTRAS: CatalogExtra[] = [
  { slug: "shot-espresso", name: "Shot extra de espresso", price: 15, recipe: [{ ingredient: "cafe-grano", qty: 18 }] },
  { slug: "matcha-extra", name: "Gramo extra de matcha", price: 12, recipe: [{ ingredient: "matcha-latte", qty: 2 }] },
  { slug: "vainilla", name: "Shot de vainilla", price: 8, recipe: [{ ingredient: "jarabe-vainilla", qty: 15 }] },
  { slug: "agave", name: "Miel de agave", price: 8, recipe: [{ ingredient: "miel-agave", qty: 15 }] },
  { slug: "crema", name: "Crema batida", price: 10, recipe: [{ ingredient: "crema-batida", qty: 25 }] },
];

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  // Matcha
  { name: "Matcha Latte", category: "matcha", price: 95, emoji: "🍵", popular: true, desc: "Matcha grado latte batido con leche cremosa.", mods: DRINK, recipe: [{ ingredient: "matcha-latte", qty: 4 }, { ingredient: "milk", qty: 240 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Iced Matcha", category: "matcha", price: 98, emoji: "🧊", popular: true, desc: "Matcha frío sobre hielo, refrescante y vibrante.", mods: COLD, recipe: [{ ingredient: "matcha-latte", qty: 4 }, { ingredient: "milk", qty: 200 }, { ingredient: "hielo", qty: 140 }, { ingredient: "vaso-16", qty: 1 }] },
  { name: "Dirty Matcha", category: "matcha", price: 110, emoji: "🌗", popular: true, desc: "Matcha latte con shot de espresso encima.", mods: DRINK, recipe: [{ ingredient: "matcha-latte", qty: 4 }, { ingredient: "cafe-grano", qty: 18 }, { ingredient: "milk", qty: 220 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Matcha Ceremonial (Usucha)", category: "matcha", price: 85, emoji: "🌿", desc: "Matcha Uji batido en agua, servicio tradicional.", mods: { milk: false, sweetness: false, temperature: false, extras: false }, recipe: [{ ingredient: "matcha-ceremonial", qty: 2 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Matcha Fresa", category: "matcha", price: 105, emoji: "🍓", popular: true, desc: "Capas de puré de fresa, leche y matcha frío.", mods: COLD, recipe: [{ ingredient: "matcha-latte", qty: 3 }, { ingredient: "fresa", qty: 60 }, { ingredient: "milk", qty: 180 }, { ingredient: "hielo", qty: 120 }, { ingredient: "vaso-16", qty: 1 }] },
  { name: "Matcha Yuzu Lemonade", category: "matcha", price: 99, emoji: "🍋", desc: "Limonada de yuzu coronada con matcha frío.", mods: { milk: false, sweetness: true, temperature: false, extras: false }, recipe: [{ ingredient: "matcha-latte", qty: 3 }, { ingredient: "yuzu", qty: 40 }, { ingredient: "hielo", qty: 150 }, { ingredient: "vaso-16", qty: 1 }] },
  { name: "Hojicha Latte", category: "matcha", price: 92, emoji: "🍂", desc: "Té verde tostado, notas de caramelo y humo.", mods: DRINK, recipe: [{ ingredient: "hojicha", qty: 4 }, { ingredient: "milk", qty: 240 }, { ingredient: "vaso-12", qty: 1 }] },
  // Café
  { name: "Espresso", category: "cafe", price: 45, emoji: "☕", desc: "Doble shot de origen.", mods: { milk: false, sweetness: false, temperature: false, extras: true }, recipe: [{ ingredient: "cafe-grano", qty: 18 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Americano", category: "cafe", price: 52, emoji: "🫘", desc: "Espresso alargado con agua caliente.", mods: { milk: false, sweetness: true, temperature: true, extras: true }, recipe: [{ ingredient: "cafe-grano", qty: 18 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Latte", category: "cafe", price: 70, emoji: "🥛", popular: true, desc: "Espresso con leche vaporizada y microespuma.", mods: DRINK, recipe: [{ ingredient: "cafe-grano", qty: 18 }, { ingredient: "milk", qty: 240 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Capuchino", category: "cafe", price: 68, emoji: "☁️", desc: "Partes iguales de espresso, leche y espuma.", mods: DRINK, recipe: [{ ingredient: "cafe-grano", qty: 18 }, { ingredient: "milk", qty: 180 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Flat White", category: "cafe", price: 74, emoji: "🤍", desc: "Doble shot con leche sedosa, intenso y corto.", mods: DRINK, recipe: [{ ingredient: "cafe-grano", qty: 36 }, { ingredient: "milk", qty: 160 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Cold Brew", category: "cafe", price: 72, emoji: "🧋", desc: "Extracción en frío 16 h, servido sobre hielo.", mods: COLD, recipe: [{ ingredient: "cafe-grano", qty: 30 }, { ingredient: "hielo", qty: 150 }, { ingredient: "vaso-16", qty: 1 }] },
  // Té
  { name: "Té Verde Sencha", category: "te", price: 58, emoji: "🫖", desc: "Infusión ligera de hoja entera japonesa.", mods: TEA, recipe: [{ ingredient: "te-sencha", qty: 5 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Té de Jazmín", category: "te", price: 58, emoji: "🌸", desc: "Té verde perfumado con flor de jazmín.", mods: TEA, recipe: [{ ingredient: "te-jazmin", qty: 5 }, { ingredient: "vaso-12", qty: 1 }] },
  { name: "Chai Latte", category: "te", price: 78, emoji: "🫚", desc: "Especias dulces con leche vaporizada.", mods: DRINK, recipe: [{ ingredient: "chai-mezcla", qty: 8 }, { ingredient: "milk", qty: 240 }, { ingredient: "vaso-12", qty: 1 }] },
  // Bakery
  { name: "Croissant de Mantequilla", category: "bakery", price: 55, emoji: "🥐", popular: true, desc: "Hojaldrado, horneado cada mañana.", mods: FOOD, recipe: [{ ingredient: "croissant-pza", qty: 1 }] },
  { name: "Panqué de Matcha", category: "bakery", price: 62, emoji: "🍰", desc: "Húmedo, con glaseado de chocolate blanco.", mods: FOOD, recipe: [{ ingredient: "pan-matcha-pza", qty: 1 }] },
  { name: "Cheesecake de Matcha", category: "bakery", price: 88, emoji: "🍮", desc: "Estilo japonés, ligero y cremoso.", mods: FOOD, recipe: [{ ingredient: "cheesecake-pza", qty: 1 }] },
  { name: "Galleta Chocolate & Miso", category: "bakery", price: 48, emoji: "🍪", desc: "Dulce-salada, crujiente por fuera.", mods: FOOD, recipe: [{ ingredient: "galleta-pza", qty: 1 }] },
  { name: "Concha de Vainilla", category: "bakery", price: 42, emoji: "🐚", desc: "Clásica mexicana, esponjosa.", mods: FOOD, recipe: [{ ingredient: "concha-pza", qty: 1 }] },
  { name: "Banana Bread", category: "bakery", price: 58, emoji: "🍌", desc: "Con nuez tostada y canela.", mods: FOOD, recipe: [{ ingredient: "banana-pza", qty: 1 }] },
];

export const CATALOG_SUMMARY = {
  ingredients: CATALOG_INGREDIENTS.length,
  milks: CATALOG_MILKS.length,
  extras: CATALOG_EXTRAS.length,
  products: CATALOG_PRODUCTS.length,
};
