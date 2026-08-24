"use server";

import {
  ValidationError,
  oneOf,
  optText,
  readState,
  reqId,
  reqNumber,
  reqText,
  run,
  type ActionResult,
} from "./action-utils";
import { requireAdmin, requireStaff } from "./auth";
import { loadSettingsRow } from "./data";
import { dayKey } from "./format";
import { db, num } from "./supabase";
import type { MovementReasonDb } from "./database.types";
import {
  ORDER_FLOW,
  type CheckoutPayload,
  type Customer,
  type OrderStatus,
  type PaymentMethod,
  type ServiceMode,
} from "./types";

/* ============================================================================
 * Acciones de operación diaria: cobrar, mover comandas, inventario, clientes y
 * corte de caja.
 *
 * Todas empiezan autorizando (`requireStaff` o `requireAdmin`) y validando la
 * entrada. Los precios NUNCA se toman de lo que manda el navegador: la función
 * `create_order` de Postgres los relee de la base.
 * ========================================================================== */

/* ---------------------------------- Estado ---------------------------------- */

export async function refreshState(): Promise<ActionResult<undefined>> {
  return readState(requireStaff);
}

/* -------------------------------- Punto de venta ----------------------------- */

const PAYMENTS: PaymentMethod[] = ["efectivo", "tarjeta", "mercadopago"];
const SERVICE_MODES: ServiceMode[] = ["aqui", "llevar"];
const TEMPERATURES = ["caliente", "frio"] as const;
const SWEETNESS = [0, 25, 50, 75, 100];

export async function checkout(
  payload: CheckoutPayload,
): Promise<ActionResult<{ orderId: string; folio: number }>> {
  return run(requireStaff, async (staff) => {
    if (!payload?.lines?.length) {
      throw new ValidationError("El ticket está vacío.");
    }
    if (payload.lines.length > 60) {
      throw new ValidationError("Demasiados renglones en un solo ticket.");
    }

    const lines = payload.lines.map((line) => {
      const sweetness = line.modifiers?.sweetness;
      if (sweetness !== undefined && !SWEETNESS.includes(sweetness)) {
        throw new ValidationError("El nivel de dulzor no es válido.");
      }
      return {
        productId: reqId(line.productId, "El producto"),
        qty: reqNumber(line.qty, "La cantidad", { min: 1, max: 99 }),
        milkId: line.modifiers?.milkId
          ? reqId(line.modifiers.milkId, "La leche")
          : null,
        sweetness: sweetness ?? null,
        temperature: line.modifiers?.temperature
          ? oneOf(line.modifiers.temperature, TEMPERATURES, "La temperatura")
          : null,
        extraIds: (line.modifiers?.extraIds ?? [])
          .slice(0, 12)
          .map((id) => reqId(id, "El extra")),
        notes: optText(line.modifiers?.notes, 200),
      };
    });

    const supabase = db();
    const { data, error } = await supabase.rpc("create_order", {
      payload: {
        lines,
        discountPct: reqNumber(payload.discountPct ?? 0, "El descuento", {
          min: 0,
          max: 100,
        }),
        discountLabel: optText(payload.discountLabel, 80),
        payment: oneOf(payload.payment, PAYMENTS, "El método de pago"),
        serviceMode: oneOf(
          payload.serviceMode ?? "llevar",
          SERVICE_MODES,
          "El modo de servicio",
        ),
        // El tope real (no mayor que el consumo) lo aplica `create_order`,
        // que es quien conoce los precios de verdad.
        tip: reqNumber(payload.tip ?? 0, "La propina", { min: 0 }),
        customerId: payload.customerId
          ? reqId(payload.customerId, "El cliente")
          : null,
        cashReceived:
          payload.cashReceived === undefined || payload.cashReceived === null
            ? null
            : reqNumber(payload.cashReceived, "El efectivo recibido"),
      },
      p_staff_id: staff.id,
    });

    if (error) throw new Error(error.message);

    const orderId = data as unknown as string;
    const created = await supabase
      .from("orders")
      .select("folio")
      .eq("id", orderId)
      .single();

    return { orderId, folio: created.data?.folio ?? 0 };
  });
}

/* ---------------------------------- Comandas -------------------------------- */

export async function moveOrder(
  orderId: string,
  direction: 1 | -1,
): Promise<ActionResult<OrderStatus>> {
  return run(requireStaff, async () => {
    const id = reqId(orderId, "El ticket");
    const supabase = db();

    const current = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();

    if (current.error || !current.data) {
      throw new Error("El ticket no existe.");
    }
    if (current.data.status === "cancelado") {
      throw new ValidationError("Un ticket cancelado ya no se mueve.");
    }

    const index = ORDER_FLOW.indexOf(current.data.status);
    const next =
      ORDER_FLOW[
        Math.min(Math.max(index + (direction === -1 ? -1 : 1), 0), ORDER_FLOW.length - 1)
      ];

    const { error } = await supabase
      .from("orders")
      .update({
        status: next,
        delivered_at: next === "entregado" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    return next;
  });
}

/** Anula un ticket: devuelve insumos y retira los puntos otorgados. */
export async function cancelOrder(
  orderId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async (staff) => {
    const { error } = await db().rpc("cancel_order", {
      p_order_id: reqId(orderId, "El ticket"),
      p_staff_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/**
 * Borra un ticket de la base, devolviendo insumos y puntos antes.
 *
 * No es lo mismo que anular. `cancelOrder` conserva el ticket porque la venta
 * ocurrió y el histórico debe poder explicarla; esto lo elimina, y existe para
 * limpiar datos de prueba. Borrar la venta es lo que después deja borrar el
 * producto que se vendió, y luego el insumo de su receta.
 *
 * Sólo administradores: es la única operación del sistema que destruye
 * histórico sin dejar rastro.
 */
export async function deleteOrder(
  orderId: string,
): Promise<ActionResult<{ folio: number }>> {
  return run(requireAdmin, async (staff) => {
    const { data, error } = await db().rpc("delete_order", {
      p_order_id: reqId(orderId, "El ticket"),
      p_staff_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return { folio: (data as unknown as number) ?? 0 };
  });
}

/* --------------------------------- Inventario -------------------------------- */

const MOVEMENT_REASONS: MovementReasonDb[] = [
  "ajuste",
  "entrada",
  "merma",
];

export async function adjustStock(
  ingredientId: string,
  delta: number,
  reason: MovementReasonDb = "ajuste",
  note?: string,
): Promise<ActionResult<number>> {
  return run(requireAdmin, async (staff) => {
    const value = reqNumber(delta, "El ajuste", {
      min: -1_000_000,
      max: 1_000_000,
    });
    if (value === 0) throw new ValidationError("El ajuste no puede ser cero.");

    const { data, error } = await db().rpc("adjust_stock", {
      p_ingredient_id: reqId(ingredientId, "El insumo"),
      p_delta: value,
      p_reason: oneOf(reason, MOVEMENT_REASONS, "El motivo"),
      p_staff_id: staff.id,
      p_note: optText(note, 200),
    });

    if (error) throw new Error(error.message);
    return num(data);
  });
}

/**
 * Entrada de mercancía: suma una cantidad escrita a mano.
 *
 * El cliente pidió esto expresamente: cuando llegan 200 vasos no tiene sentido
 * picarle 200 veces al botón de +.
 */
export async function receiveStock(
  ingredientId: string,
  amount: number,
  note?: string,
): Promise<ActionResult<number>> {
  return run(requireAdmin, async (staff) => {
    const value = reqNumber(amount, "La cantidad recibida", {
      min: 0.001,
      max: 1_000_000,
    });

    const { data, error } = await db().rpc("adjust_stock", {
      p_ingredient_id: reqId(ingredientId, "El insumo"),
      p_delta: value,
      p_reason: "entrada",
      p_staff_id: staff.id,
      p_note: optText(note, 200) ?? "Entrada de mercancía",
    });

    if (error) throw new Error(error.message);
    return num(data);
  });
}

/** Fija el stock a una cantidad contada, registrando la diferencia. */
export async function setStock(
  ingredientId: string,
  counted: number,
  note?: string,
): Promise<ActionResult<number>> {
  return run(requireAdmin, async (staff) => {
    const id = reqId(ingredientId, "El insumo");
    const target = reqNumber(counted, "La cantidad contada", { min: 0 });

    const supabase = db();
    const current = await supabase
      .from("ingredients")
      .select("stock")
      .eq("id", id)
      .single();

    if (current.error || !current.data) throw new Error("El insumo no existe.");

    const delta = Math.round((target - num(current.data.stock)) * 1000) / 1000;
    if (delta === 0) return target;

    const { data, error } = await supabase.rpc("adjust_stock", {
      p_ingredient_id: id,
      p_delta: delta,
      p_reason: "ajuste",
      p_staff_id: staff.id,
      p_note: optText(note, 200) ?? "Conteo físico",
    });

    if (error) throw new Error(error.message);
    return num(data);
  });
}

export interface IngredientInput {
  id?: string;
  name: string;
  unit: "g" | "ml" | "pza";
  /** Umbral de alerta, en la unidad del insumo */
  min: number;
  weeklyUse: number;
  /** Vasos, tapas y demás desechables: solo se gastan en pedidos para llevar */
  isPackaging: boolean;
  /** Nivel objetivo de resurtido; deja leer el umbral como porcentaje */
  parLevel?: number | null;
  /** Sólo al crear: existencia inicial */
  stock?: number;
}

export async function saveIngredient(
  input: IngredientInput,
): Promise<ActionResult<string>> {
  return run(requireAdmin, async (staff) => {
    const supabase = db();
    const patch = {
      name: reqText(input.name, "El nombre del insumo", 120),
      unit: oneOf(input.unit, ["g", "ml", "pza"] as const, "La unidad"),
      min_stock: reqNumber(input.min, "El umbral de alerta", { min: 0 }),
      weekly_use: reqNumber(input.weeklyUse ?? 0, "El uso semanal", { min: 0 }),
      is_packaging: !!input.isPackaging,
      par_level:
        input.parLevel === null || input.parLevel === undefined
          ? null
          : reqNumber(input.parLevel, "El nivel objetivo", { min: 0 }),
    };

    if (input.id) {
      const id = reqId(input.id, "El insumo");
      const { error } = await supabase
        .from("ingredients")
        .update(patch)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    }

    const stock = reqNumber(input.stock ?? 0, "La existencia inicial", { min: 0 });
    const { data, error } = await supabase
      .from("ingredients")
      .insert({ ...patch, stock })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    if (stock > 0 && data) {
      await supabase.from("inventory_movements").insert({
        ingredient_id: data.id,
        delta: stock,
        stock_after: stock,
        reason: "entrada",
        staff_id: staff.id,
        note: "Existencia inicial",
      });
    }
    return data!.id;
  });
}

export async function deleteIngredient(
  ingredientId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const id = reqId(ingredientId, "El insumo");
    const supabase = db();

    // Si alguna receta lo usa, se archiva en lugar de borrarse: borrar en
    // cascada dejaría productos sin receta sin avisar a nadie.
    const [inProducts, inExtras] = await Promise.all([
      supabase
        .from("product_recipe_items")
        .select("id", { count: "exact", head: true })
        .eq("ingredient_id", id),
      supabase
        .from("extra_recipe_items")
        .select("id", { count: "exact", head: true })
        .eq("ingredient_id", id),
    ]);

    const used = (inProducts.count ?? 0) + (inExtras.count ?? 0);
    if (used > 0) {
      throw new ValidationError(
        `Este insumo se usa en ${used} receta${used === 1 ? "" : "s"}. Quítalo de ahí antes de eliminarlo.`,
      );
    }

    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/* ---------------------------------- Clientes -------------------------------- */

/*
 * El módulo de Clientes es sólo para administradores, así que estas acciones
 * exigen lo mismo. Al cobrar sí se puede elegir a un cliente y sumar puntos:
 * eso ocurre dentro de `create_order`, que un empleado sí puede ejecutar.
 */

export interface CustomerInput {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export async function saveCustomer(
  input: CustomerInput,
): Promise<ActionResult<string>> {
  return run(requireAdmin, async () => {
    const email = optText(input.email, 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new ValidationError("El correo no tiene un formato válido.");
    }

    const patch = {
      name: reqText(input.name, "El nombre", 120),
      phone: optText(input.phone, 40),
      email,
      notes: optText(input.notes, 500),
    };

    const supabase = db();
    if (input.id) {
      const id = reqId(input.id, "El cliente");
      const { error } = await supabase.from("customers").update(patch).eq("id", id);
      if (error) throw new Error(translateCustomerError(error.message));
      return id;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert(patch)
      .select("id")
      .single();
    if (error) throw new Error(translateCustomerError(error.message));
    return data!.id;
  });
}

function translateCustomerError(message: string): string {
  if (message.includes("customers_phone_key")) {
    return "Ya hay un cliente registrado con ese teléfono.";
  }
  return message;
}

/** Baja lógica: el histórico de ventas del cliente se conserva. */
export async function archiveCustomer(
  customerId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const { error } = await db()
      .from("customers")
      .update({ active: false })
      .eq("id", reqId(customerId, "El cliente"));
    if (error) throw new Error(error.message);
    return undefined;
  });
}

export async function addPoints(
  customerId: string,
  points: number,
  reason: string,
): Promise<ActionResult<number>> {
  return run(requireAdmin, async (staff) => {
    const { data, error } = await db().rpc("adjust_points", {
      p_customer_id: reqId(customerId, "El cliente"),
      p_points: Math.round(
        reqNumber(points, "Los puntos", { min: -100_000, max: 100_000 }),
      ),
      p_reason: reqText(reason, "El motivo", 160),
      p_staff_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return Math.round(num(data));
  });
}

export async function redeemReward(
  customerId: string,
  cost: number,
  label: string,
): Promise<ActionResult<number>> {
  return run(requireAdmin, async (staff) => {
    const id = reqId(customerId, "El cliente");
    const amount = Math.round(reqNumber(cost, "El costo", { min: 1, max: 100_000 }));

    const supabase = db();
    const current = await supabase
      .from("customers")
      .select("points, name")
      .eq("id", id)
      .single();

    if (current.error || !current.data) throw new Error("El cliente no existe.");
    if (current.data.points < amount) {
      throw new ValidationError(
        `${current.data.name} tiene ${current.data.points} puntos; el canje cuesta ${amount}.`,
      );
    }

    const { data, error } = await supabase.rpc("adjust_points", {
      p_customer_id: id,
      p_points: -amount,
      p_reason: reqText(label, "La recompensa", 160),
      p_staff_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return Math.round(num(data));
  });
}

/** Búsqueda por nombre, teléfono o correo (para cuando la lista es larga). */
export async function searchCustomers(term: string): Promise<Customer[]> {
  try {
    await requireStaff();
  } catch {
    return [];
  }
  const query = term.trim();
  if (query.length < 2) return [];

  const escaped = query.replace(/[%_,()]/g, " ");
  const { data } = await db()
    .from("customers")
    .select("*")
    .eq("active", true)
    .or(
      `name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`,
    )
    .order("last_visit", { ascending: false, nullsFirst: false })
    .limit(30);

  return (data ?? []).map((row) => ({
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
  }));
}

/* ------------------------------- Corte de caja ------------------------------- */

export async function closeCash(
  counted: number,
  notes?: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async (staff) => {
    const { error } = await db().rpc("close_cash", {
      p_counted: reqNumber(counted, "El efectivo contado", { min: 0 }),
      p_notes: optText(notes, 400),
      p_staff_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/** Reabre el turno del día borrando el corte, para poder seguir cobrando. */
export async function reopenCash(): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    // El día operativo se calcula con la zona horaria del negocio, la misma que
    // usó `close_cash` al registrar el corte.
    const settings = await loadSettingsRow();
    const today = dayKey(new Date(), settings.timezone);

    const { error } = await db()
      .from("cash_closes")
      .delete()
      .eq("date_key", today);
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/* --------------------------- Productos preparados ---------------------------- */

export interface PreparedItemInput {
  id?: string;
  name: string;
  qty: number;
  unit: "g" | "ml" | "pza";
  producedOn: string;
  expiresOn: string;
  notes?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function reqDate(value: unknown, label: string): string {
  const text = reqText(value, label, 10);
  if (!DATE_RE.test(text) || Number.isNaN(Date.parse(`${text}T12:00:00Z`))) {
    throw new ValidationError(`${label} no es una fecha válida (AAAA-MM-DD).`);
  }
  return text;
}

/** Alta o edición de un lote elaborado en casa (mermelada, jarabe, pastel…). */
export async function savePreparedItem(
  input: PreparedItemInput,
): Promise<ActionResult<string>> {
  return run(requireAdmin, async (staff) => {
    const producedOn = reqDate(input.producedOn, "La fecha de elaboración");
    const expiresOn = reqDate(input.expiresOn, "La fecha de caducidad");
    if (expiresOn < producedOn) {
      throw new ValidationError(
        "La caducidad no puede ser anterior a la elaboración.",
      );
    }

    const patch = {
      name: reqText(input.name, "El nombre", 120),
      qty: reqNumber(input.qty ?? 0, "La cantidad", { min: 0, max: 100_000 }),
      unit: oneOf(input.unit, ["g", "ml", "pza"] as const, "La unidad"),
      produced_on: producedOn,
      expires_on: expiresOn,
      notes: optText(input.notes, 400),
    };

    const supabase = db();
    if (input.id) {
      const id = reqId(input.id, "El producto preparado");
      // Al mover la caducidad, la alerta atendida vuelve a contar desde cero.
      const { error } = await supabase
        .from("prepared_items")
        .update({ ...patch, acknowledged_at: null, acknowledged_by: null })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    }

    const { data, error } = await supabase
      .from("prepared_items")
      .insert({ ...patch, created_by: staff.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data!.id;
  });
}

/**
 * Marca la alerta como atendida. La alerta del último día no desaparece sola:
 * sigue en rojo hasta que alguien la revisa, que fue justo lo que pidió el
 * cliente para no perder de vista un lote a punto de vencer.
 */
export async function acknowledgePreparedItem(
  itemId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async (staff) => {
    const { error } = await db()
      .from("prepared_items")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: staff.id,
      })
      .eq("id", reqId(itemId, "El producto preparado"));
    if (error) throw new Error(error.message);
    return undefined;
  });
}

/** Se acabó o se tiró: sale de la lista pero queda el registro. */
export async function discardPreparedItem(
  itemId: string,
): Promise<ActionResult<undefined>> {
  return run(requireAdmin, async () => {
    const { error } = await db()
      .from("prepared_items")
      .update({ discarded_at: new Date().toISOString() })
      .eq("id", reqId(itemId, "El producto preparado"));
    if (error) throw new Error(error.message);
    return undefined;
  });
}
