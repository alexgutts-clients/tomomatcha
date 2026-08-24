"use server";

import {
  ValidationError,
  oneOf,
  optText,
  optUrl,
  reqId,
  reqNumber,
  reqText,
  reqTimezone,
  run,
  type ActionResult,
} from "./action-utils";
import { requireAdmin } from "./auth";
import {
  CATALOG_EXTRAS,
  CATALOG_INGREDIENTS,
  CATALOG_MILKS,
  CATALOG_PRODUCTS,
} from "./catalog";
import { loadSettingsRow } from "./data";
import { db } from "./supabase";
import {
  ALLOWED_MEDIA_TYPES,
  MEDIA_MAX_BYTES,
  buildObjectKey,
  deleteObject,
  isR2Configured,
  isSafeObjectKey,
  presignUpload,
  r2Bucket,
  type MediaPurpose,
} from "./r2";
import { CATEGORY_IDS, type CategoryId, type FeatureFlags, type Role } from "./types";

/* ============================================================================
 * Acciones de administración: carta, insumos globales, ajustes, equipo y media.
 *
 * Todas exigen rol de administrador.
 * ========================================================================== */

/* ---------------------------------- Productos -------------------------------- */

export interface RecipeInput {
  /** `"milk"` = la leche que elija el cliente */
  ingredientId: string | "milk";
  qty: number;
}

export interface ProductInput {
  id?: string;
  name: string;
  category: CategoryId;
  price: number;
  desc?: string;
  emoji?: string;
  active: boolean;
  popular: boolean;
  mods: {
    milk: boolean;
    sweetness: boolean;
    temperature: boolean;
    extras: boolean;
  };
  recipe: RecipeInput[];
}

function normalizeRecipe(recipe: RecipeInput[]): RecipeInput[] {
  if (recipe.length > 30) {
    throw new ValidationError("Una receta no puede pasar de 30 renglones.");
  }
  const seen = new Set<string>();
  return recipe.map((item) => {
    const key =
      item.ingredientId === "milk" ? "milk" : reqId(item.ingredientId, "El insumo");
    if (seen.has(key)) {
      throw new ValidationError(
        "La receta repite un insumo. Súmalo en un solo renglón.",
      );
    }
    seen.add(key);
    return {
      ingredientId: key,
      qty: reqNumber(item.qty, "La cantidad de la receta", {
        min: 0.001,
        max: 100_000,
      }),
    };
  });
}

async function writeRecipe(productId: string, recipe: RecipeInput[]) {
  const supabase = db();
  const { error: clearError } = await supabase
    .from("product_recipe_items")
    .delete()
    .eq("product_id", productId);
  if (clearError) throw new Error(clearError.message);

  if (!recipe.length) return;

  const { error } = await supabase.from("product_recipe_items").insert(
    recipe.map((item) => ({
      product_id: productId,
      ingredient_id: item.ingredientId === "milk" ? null : item.ingredientId,
      is_milk: item.ingredientId === "milk",
      qty: item.qty,
    })),
  );
  if (error) throw new Error(error.message);
}

export async function saveProduct(
  input: ProductInput,
): Promise<ActionResult<string>> {
  return run(requireAdmin, async () => {
    const recipe = normalizeRecipe(input.recipe ?? []);
    const usesMilk = recipe.some((r) => r.ingredientId === "milk");
    if (usesMilk && !input.mods?.milk) {
      throw new ValidationError(
        "La receta usa «leche elegida», así que el producto debe permitir elegir leche.",
      );
    }

    const patch = {
      name: reqText(input.name, "El nombre del producto", 120),
      category: oneOf(input.category, CATEGORY_IDS, "La categoría"),
      price: reqNumber(input.price, "El precio", { min: 0, max: 100_000 }),
      description: optText(input.desc, 300) ?? "",
      emoji: (optText(input.emoji, 8) ?? "🍵").slice(0, 8),
      active: !!input.active,
      popular: !!input.popular,
      mod_milk: !!input.mods?.milk,
      mod_sweetness: !!input.mods?.sweetness,
      mod_temperature: !!input.mods?.temperature,
      mod_extras: !!input.mods?.extras,
    };

    const supabase = db();

    if (input.id) {
      const id = reqId(input.id, "El producto");
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw new Error(translateNameConflict(error.message, "producto"));
      await writeRecipe(id, recipe);
      return id;
    }

    const { data, error } = await supabase
      .from("products")
      .insert(patch)
      .select("id")
      .single();
    if (error) throw new Error(translateNameConflict(error.message, "producto"));
    await writeRecipe(data!.id, recipe);
    return data!.id;
  });
}

function translateNameConflict(message: string, what: string): string {
  return /_name_key/.test(message)
    ? `Ya existe un ${what} con ese nombre.`
    : message;
}

export async function toggleProduct(
  productId: string,
): Promise<ActionResult<boolean>> {
  return run(requireAdmin, async () => {
    const id = reqId(productId, "El producto");
    const supabase = db();
    const current = await supabase
      .from("products")
      .select("active")
      .eq("id", id)
      .single();
    if (current.error || !current.data) throw new Error("El producto no existe.");

    const next = !current.data.active;
    const { error } = await supabase
      .from("products")
      .update({ active: next })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return next;
  });
}

export async function setProductPrice(
  productId: string,
  price: number,
): Promise<ActionResult<number>> {
  return run(requireAdmin, async () => {
    const value = reqNumber(price, "El precio", { min: 0, max: 100_000 });
    const { error } = await db()
      .from("products")
      .update({ price: value })
      .eq("id", reqId(productId, "El producto"));
    if (error) throw new Error(error.message);
    return value;
  });
}

export async function setProductMod(
  productId: string,
  mod: "milk" | "sweetness" | "temperature" | "extras",
  value: boolean,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const id = reqId(productId, "El producto");
    const key = oneOf(
      mod,
      ["milk", "sweetness", "temperature", "extras"] as const,
      "La opción",
    );
    const supabase = db();

    if (key === "milk" && !value) {
      const milkLine = await supabase
        .from("product_recipe_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", id)
        .eq("is_milk", true);
      if ((milkLine.count ?? 0) > 0) {
        throw new ValidationError(
          "La receta de este producto usa «leche elegida». Quita ese renglón antes de apagar la opción de leche.",
        );
      }
    }

    const on = !!value;
    const patch =
      key === "milk"
        ? { mod_milk: on }
        : key === "sweetness"
          ? { mod_sweetness: on }
          : key === "temperature"
            ? { mod_temperature: on }
            : { mod_extras: on };

    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

export async function deleteProduct(
  productId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const id = reqId(productId, "El producto");
    const supabase = db();

    const sold = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id);

    // Con ventas registradas se saca del menú en lugar de borrarse: así los
    // reportes históricos siguen sabiendo qué se vendió.
    if ((sold.count ?? 0) > 0) {
      const { error } = await supabase
        .from("products")
        .update({ active: false })
        .eq("id", id);
      if (error) throw new Error(error.message);
      throw new ValidationError(
        "Este producto tiene ventas registradas, así que se sacó del menú en lugar de borrarse (los reportes históricos lo necesitan).",
      );
    }

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/* ------------------------------ Leches y extras ------------------------------ */

export interface MilkInput {
  id?: string;
  name: string;
  surcharge: number;
  ingredientId: string | null;
  available: boolean;
}

export async function saveMilk(input: MilkInput): Promise<ActionResult<string>> {
  return run(requireAdmin, async () => {
    const patch = {
      name: reqText(input.name, "El nombre de la leche", 80),
      surcharge: reqNumber(input.surcharge ?? 0, "El cargo extra", {
        min: 0,
        max: 10_000,
      }),
      ingredient_id: input.ingredientId
        ? reqId(input.ingredientId, "El insumo")
        : null,
      available: !!input.available,
    };

    const supabase = db();
    if (input.id) {
      const id = reqId(input.id, "La leche");
      const { error } = await supabase.from("milk_options").update(patch).eq("id", id);
      if (error) throw new Error(translateNameConflict(error.message, "tipo de leche"));
      return id;
    }
    const { data, error } = await supabase
      .from("milk_options")
      .insert(patch)
      .select("id")
      .single();
    if (error) throw new Error(translateNameConflict(error.message, "tipo de leche"));
    return data!.id;
  });
}

export async function toggleMilk(milkId: string): Promise<ActionResult<boolean>> {
  return run(requireAdmin, async () => {
    const id = reqId(milkId, "La leche");
    const supabase = db();
    const current = await supabase
      .from("milk_options")
      .select("available")
      .eq("id", id)
      .single();
    if (current.error || !current.data) throw new Error("La leche no existe.");
    const next = !current.data.available;
    const { error } = await supabase
      .from("milk_options")
      .update({ available: next })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return next;
  });
}

export async function deleteMilk(milkId: string): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const { error } = await db()
      .from("milk_options")
      .delete()
      .eq("id", reqId(milkId, "La leche"));
    if (error) throw new Error(error.message);
    return undefined;
  });
}

export interface ExtraInput {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  recipe: { ingredientId: string; qty: number }[];
}

export async function saveExtra(input: ExtraInput): Promise<ActionResult<string>> {
  return run(requireAdmin, async () => {
    const patch = {
      name: reqText(input.name, "El nombre del extra", 80),
      price: reqNumber(input.price ?? 0, "El precio", { min: 0, max: 10_000 }),
      available: !!input.available,
    };

    const recipe = (input.recipe ?? []).slice(0, 10).map((item) => ({
      ingredient_id: reqId(item.ingredientId, "El insumo"),
      qty: reqNumber(item.qty, "La cantidad", { min: 0.001, max: 100_000 }),
    }));

    const supabase = db();
    let id: string;

    if (input.id) {
      id = reqId(input.id, "El extra");
      const { error } = await supabase.from("extras").update(patch).eq("id", id);
      if (error) throw new Error(translateNameConflict(error.message, "extra"));
    } else {
      const { data, error } = await supabase
        .from("extras")
        .insert(patch)
        .select("id")
        .single();
      if (error) throw new Error(translateNameConflict(error.message, "extra"));
      id = data!.id;
    }

    const cleared = await supabase
      .from("extra_recipe_items")
      .delete()
      .eq("extra_id", id);
    if (cleared.error) throw new Error(cleared.error.message);

    if (recipe.length) {
      const { error } = await supabase
        .from("extra_recipe_items")
        .insert(recipe.map((item) => ({ ...item, extra_id: id })));
      if (error) throw new Error(error.message);
    }
    return id;
  });
}

export async function toggleExtra(extraId: string): Promise<ActionResult<boolean>> {
  return run(requireAdmin, async () => {
    const id = reqId(extraId, "El extra");
    const supabase = db();
    const current = await supabase
      .from("extras")
      .select("available")
      .eq("id", id)
      .single();
    if (current.error || !current.data) throw new Error("El extra no existe.");
    const next = !current.data.available;
    const { error } = await supabase
      .from("extras")
      .update({ available: next })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return next;
  });
}

export async function deleteExtra(extraId: string): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const { error } = await db()
      .from("extras")
      .delete()
      .eq("id", reqId(extraId, "El extra"));
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/* ----------------------------------- Ajustes --------------------------------- */

const FLAG_KEYS: (keyof FeatureFlags)[] = [
  "inventario",
  "lealtad",
  "resenasGoogle",
  "mercadoPago",
];

export async function setFlag(
  flag: keyof FeatureFlags,
  value: boolean,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const key = oneOf(flag, FLAG_KEYS, "El módulo");
    const on = !!value;
    const patch =
      key === "inventario"
        ? { flag_inventario: on }
        : key === "lealtad"
          ? { flag_lealtad: on }
          : key === "resenasGoogle"
            ? { flag_resenas_google: on }
            : { flag_mercadopago: on };

    const { error } = await db().from("settings").update(patch).eq("id", 1);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

export interface SettingsInput {
  businessName: string;
  branchName: string;
  timezone: string;
  cashFloat: number;
  pointsPerCurrency: number;
  rewardCost: number;
  googleReviewUrl?: string;
  googleRating?: number | null;
  googleReviewsCount?: number | null;
}

export async function saveSettings(
  input: SettingsInput,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const { error } = await db()
      .from("settings")
      .update({
        business_name: reqText(input.businessName, "El nombre del negocio", 120),
        branch_name: reqText(input.branchName, "El nombre de la sucursal", 120),
        timezone: reqTimezone(input.timezone),
        cash_float: reqNumber(input.cashFloat ?? 0, "El fondo de caja", {
          min: 0,
          max: 1_000_000,
        }),
        points_per_currency: reqNumber(
          input.pointsPerCurrency ?? 1,
          "Los puntos por peso",
          { min: 0, max: 100 },
        ),
        reward_cost: Math.round(
          reqNumber(input.rewardCost ?? 500, "El costo del canje", {
            min: 1,
            max: 1_000_000,
          }),
        ),
        google_review_url: optUrl(input.googleReviewUrl),
        google_rating:
          input.googleRating === null || input.googleRating === undefined
            ? null
            : reqNumber(input.googleRating, "La calificación", { min: 0, max: 5 }),
        google_reviews_count:
          input.googleReviewsCount === null ||
          input.googleReviewsCount === undefined
            ? null
            : Math.round(
                reqNumber(input.googleReviewsCount, "El número de reseñas", {
                  min: 0,
                  max: 10_000_000,
                }),
              ),
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/* ------------------------------ Catálogo inicial ----------------------------- */

/**
 * Inserta el catálogo sugerido. Sólo funciona con la carta vacía, para que no
 * pueda duplicar productos por accidente.
 */
export async function seedCatalog(): Promise<ActionResult<{ products: number }>> {
  return run(requireAdmin, async (staff) => {
    const supabase = db();

    const existing = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });
    if ((existing.count ?? 0) > 0) {
      throw new ValidationError(
        "Ya hay productos en la carta. El catálogo inicial sólo se puede cargar cuando está vacía.",
      );
    }

    /* Insumos */
    const ingredientRows = CATALOG_INGREDIENTS.map((item) => ({
      name: item.name,
      unit: item.unit,
      stock: 0,
      min_stock: item.min,
      weekly_use: item.weeklyUse,
      is_packaging: item.packaging ?? false,
    }));
    const ingredients = await supabase
      .from("ingredients")
      .upsert(ingredientRows, { onConflict: "name", ignoreDuplicates: false })
      .select("id, name");

    if (ingredients.error) {
      // `upsert` con índice sobre `lower(name)` puede no resolverse; se
      // reintenta insumo por insumo leyendo el existente.
      for (const row of ingredientRows) {
        const found = await supabase
          .from("ingredients")
          .select("id")
          .ilike("name", row.name)
          .maybeSingle();
        if (!found.data) {
          const inserted = await supabase.from("ingredients").insert(row);
          if (inserted.error) throw new Error(inserted.error.message);
        }
      }
    }

    const allIngredients = await supabase.from("ingredients").select("id, name");
    if (allIngredients.error) throw new Error(allIngredients.error.message);

    const idByName = new Map<string, string>();
    for (const row of allIngredients.data ?? []) {
      idByName.set(row.name.toLowerCase(), row.id);
    }
    const idBySlug = new Map<string, string>();
    for (const item of CATALOG_INGREDIENTS) {
      const id = idByName.get(item.name.toLowerCase());
      if (id) idBySlug.set(item.slug, id);
    }

    /* Leches */
    for (const [index, milk] of CATALOG_MILKS.entries()) {
      const exists = await supabase
        .from("milk_options")
        .select("id")
        .ilike("name", milk.name)
        .maybeSingle();
      if (exists.data) continue;
      const { error } = await supabase.from("milk_options").insert({
        name: milk.name,
        surcharge: milk.surcharge,
        ingredient_id: milk.ingredient ? idBySlug.get(milk.ingredient) ?? null : null,
        available: true,
        sort_order: index,
      });
      if (error) throw new Error(error.message);
    }

    /* Extras */
    for (const [index, extra] of CATALOG_EXTRAS.entries()) {
      const exists = await supabase
        .from("extras")
        .select("id")
        .ilike("name", extra.name)
        .maybeSingle();
      let extraId = exists.data?.id;
      if (!extraId) {
        const inserted = await supabase
          .from("extras")
          .insert({
            name: extra.name,
            price: extra.price,
            available: true,
            sort_order: index,
          })
          .select("id")
          .single();
        if (inserted.error) throw new Error(inserted.error.message);
        extraId = inserted.data.id;
      }
      const rows = extra.recipe
        .map((item) => ({
          extra_id: extraId!,
          ingredient_id: idBySlug.get(item.ingredient),
          qty: item.qty,
        }))
        .filter((r): r is { extra_id: string; ingredient_id: string; qty: number } =>
          Boolean(r.ingredient_id),
        );
      if (rows.length) {
        const { error } = await supabase
          .from("extra_recipe_items")
          .upsert(rows, { onConflict: "extra_id,ingredient_id" });
        if (error) throw new Error(error.message);
      }
    }

    /* Productos */
    let created = 0;
    for (const [index, product] of CATALOG_PRODUCTS.entries()) {
      const inserted = await supabase
        .from("products")
        .insert({
          name: product.name,
          category: product.category,
          price: product.price,
          description: product.desc,
          emoji: product.emoji,
          active: true,
          popular: !!product.popular,
          sort_order: index,
          mod_milk: product.mods.milk,
          mod_sweetness: product.mods.sweetness,
          mod_temperature: product.mods.temperature,
          mod_extras: product.mods.extras,
        })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      created += 1;

      const recipeRows = product.recipe
        .map((item) => ({
          product_id: inserted.data.id,
          ingredient_id:
            item.ingredient === "milk" ? null : idBySlug.get(item.ingredient) ?? null,
          is_milk: item.ingredient === "milk",
          qty: item.qty,
        }))
        .filter((row) => row.is_milk || row.ingredient_id);

      if (recipeRows.length) {
        const { error } = await supabase
          .from("product_recipe_items")
          .insert(recipeRows);
        if (error) throw new Error(error.message);
      }
    }

    await supabase
      .from("settings")
      .update({ catalog_seeded_at: new Date().toISOString() })
      .eq("id", 1);

    void staff;
    return { products: created };
  });
}

/* ----------------------------------- Equipo ---------------------------------- */

export async function setStaffRole(
  staffId: string,
  role: Role,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async (me) => {
    const id = reqId(staffId, "El usuario");
    if (id === me.id) {
      throw new ValidationError(
        "No puedes cambiar tu propio rol. Pídele a otro administrador que lo haga.",
      );
    }
    const { error } = await db()
      .from("staff")
      .update({ role: oneOf(role, ["admin", "empleado"] as const, "El rol") })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

export async function setStaffActive(
  staffId: string,
  active: boolean,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async (me) => {
    const id = reqId(staffId, "El usuario");
    if (id === me.id) {
      throw new ValidationError("No puedes desactivar tu propia cuenta.");
    }

    const supabase = db();
    if (!active) {
      // Nunca dejar el sistema sin administradores activos.
      const admins = await supabase
        .from("staff")
        .select("id")
        .eq("role", "admin")
        .eq("active", true);
      const remaining = (admins.data ?? []).filter((row) => row.id !== id);
      if (remaining.length === 0) {
        throw new ValidationError(
          "Tiene que quedar al menos un administrador activo.",
        );
      }
    }

    const { error } = await supabase
      .from("staff")
      .update({ active: !!active })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

export async function removeStaff(
  staffId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async (me) => {
    const id = reqId(staffId, "El usuario");
    if (id === me.id) {
      throw new ValidationError("No puedes eliminar tu propia cuenta.");
    }
    const { error } = await db().from("staff").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/* ------------------------------------ Media ---------------------------------- */

const PURPOSES: MediaPurpose[] = ["producto", "logo", "general"];

export interface UploadTicket {
  uploadUrl: string;
  key: string;
}

/**
 * Devuelve una URL firmada para subir un archivo directo a R2 desde el
 * navegador. El servidor nunca recibe el archivo, así que el tamaño no lo
 * limita Next.js.
 */
export async function requestUpload(input: {
  purpose: MediaPurpose;
  contentType: string;
  size: number;
  name?: string;
}): Promise<ActionResult<UploadTicket>> {
  return run(requireAdmin, async () => {
    if (!isR2Configured()) {
      throw new ValidationError(
        "Cloudflare R2 no está configurado todavía. Revisa INSTRUCCIONES.md.",
      );
    }
    const purpose = oneOf(input.purpose, PURPOSES, "El destino del archivo");
    const contentType = oneOf(
      input.contentType,
      ALLOWED_MEDIA_TYPES,
      "El tipo de archivo",
    );
    const size = reqNumber(input.size, "El tamaño", { min: 1, max: MEDIA_MAX_BYTES });
    if (size > MEDIA_MAX_BYTES) {
      throw new ValidationError(
        `El archivo pasa de ${Math.round(MEDIA_MAX_BYTES / 1024 / 1024)} MB.`,
      );
    }

    const key = buildObjectKey(purpose, contentType, optText(input.name, 120) ?? undefined);
    return { uploadUrl: await presignUpload(key, contentType), key };
  });
}

/** Registra el archivo ya subido y lo asocia a un producto o al logo. */
export async function attachMedia(input: {
  key: string;
  purpose: MediaPurpose;
  contentType: string;
  size: number;
  name?: string;
  productId?: string;
}): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async (staff) => {
    const key = reqText(input.key, "La clave del archivo", 512);
    if (!isSafeObjectKey(key)) {
      throw new ValidationError("La clave del archivo no es válida.");
    }
    const purpose = oneOf(input.purpose, PURPOSES, "El destino del archivo");
    const supabase = db();

    const { error: assetError } = await supabase.from("media_assets").upsert(
      {
        object_key: key,
        bucket: r2Bucket(),
        purpose,
        content_type: oneOf(
          input.contentType,
          ALLOWED_MEDIA_TYPES,
          "El tipo de archivo",
        ),
        size_bytes: Math.round(
          reqNumber(input.size, "El tamaño", { min: 0, max: MEDIA_MAX_BYTES }),
        ),
        original_name: optText(input.name, 200),
        uploaded_by: staff.id,
      },
      { onConflict: "object_key" },
    );
    if (assetError) throw new Error(assetError.message);

    if (purpose === "producto") {
      const productId = reqId(input.productId, "El producto");
      const previous = await supabase
        .from("products")
        .select("image_key")
        .eq("id", productId)
        .single();

      const { error } = await supabase
        .from("products")
        .update({ image_key: key })
        .eq("id", productId);
      if (error) throw new Error(error.message);

      await discardOrphan(previous.data?.image_key ?? null, key);
    }

    if (purpose === "logo") {
      const previous = await supabase
        .from("settings")
        .select("logo_key")
        .eq("id", 1)
        .single();

      const { error } = await supabase
        .from("settings")
        .update({ logo_key: key })
        .eq("id", 1);
      if (error) throw new Error(error.message);

      await discardOrphan(previous.data?.logo_key ?? null, key);
    }

    return undefined;
  });
}

/** Borra del bucket la imagen que acaba de quedar sin dueño. */
async function discardOrphan(previousKey: string | null, newKey: string) {
  if (!previousKey || previousKey === newKey) return;
  const supabase = db();
  const [products, settings] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("image_key", previousKey),
    supabase
      .from("settings")
      .select("id", { count: "exact", head: true })
      .eq("logo_key", previousKey),
  ]);
  if ((products.count ?? 0) > 0 || (settings.count ?? 0) > 0) return;

  await supabase.from("media_assets").delete().eq("object_key", previousKey);
  try {
    await deleteObject(previousKey);
  } catch {
    // El archivo queda huérfano en el bucket: no vale la pena romper la acción.
  }
}

export async function removeProductImage(
  productId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const id = reqId(productId, "El producto");
    const supabase = db();
    const current = await supabase
      .from("products")
      .select("image_key")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("products")
      .update({ image_key: null })
      .eq("id", id);
    if (error) throw new Error(error.message);

    await discardOrphan(current.data?.image_key ?? null, "");
    return undefined;
  });
}

export async function removeLogo(): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const settings = await loadSettingsRow();
    const { error } = await db()
      .from("settings")
      .update({ logo_key: null })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    await discardOrphan(settings.logo_key, "");
    return undefined;
  });
}
