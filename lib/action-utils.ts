import "server-only";

import { revalidatePath } from "next/cache";
import { AuthError } from "./auth";
import { loadAppState } from "./data";
import { ConfigError } from "./supabase";
import type { AppState, Staff } from "./types";

/* ============================================================================
 * Envoltura común de las server actions.
 *
 * Cada acción devuelve el estado completo recién leído de la base. Es una
 * consulta extra por mutación, y a cambio la interfaz nunca queda desfasada:
 * si otra caja vendió al mismo tiempo, la respuesta ya lo incluye.
 *
 * Los errores no se propagan como excepciones al navegador: se traducen a un
 * mensaje en español que el módulo muestra como aviso.
 * ========================================================================== */

export type ActionResult<T = undefined> =
  | { ok: true; state: AppState; data: T }
  | { ok: false; error: string; kind?: AuthError["kind"] | "config" };

/** Convierte cualquier excepción en un mensaje entendible para el equipo. */
export function describeError(error: unknown): {
  message: string;
  kind?: AuthError["kind"] | "config";
} {
  if (error instanceof AuthError) {
    return { message: error.message, kind: error.kind };
  }
  if (error instanceof ConfigError) {
    return { message: error.message, kind: "config" };
  }
  if (error instanceof Error) {
    // Los mensajes de Postgres llegan con prefijos técnicos que no aportan.
    const clean = error.message
      .replace(/^.*?:\s*(?=[A-ZÁÉÍÓÚÑ¡])/, "")
      .replace(/\s*\(SQLSTATE.*\)$/, "");
    return { message: clean || "Algo salió mal. Vuelve a intentarlo." };
  }
  return { message: "Algo salió mal. Vuelve a intentarlo." };
}

/* --------------------------------- Validación -------------------------------- */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function reqText(value: unknown, label: string, max = 160): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ValidationError(`${label} no puede quedar vacío.`);
  if (text.length > max) {
    throw new ValidationError(`${label} no puede pasar de ${max} caracteres.`);
  }
  return text;
}

export function optText(value: unknown, max = 400): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  return text.slice(0, max);
}

export function reqNumber(
  value: unknown,
  label: string,
  { min = 0, max = 9_999_999 }: { min?: number; max?: number } = {},
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`${label} tiene que ser un número.`);
  }
  if (n < min) throw new ValidationError(`${label} no puede ser menor que ${min}.`);
  if (n > max) throw new ValidationError(`${label} no puede ser mayor que ${max}.`);
  return Math.round(n * 1000) / 1000;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reqId(value: unknown, label = "El identificador"): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new ValidationError(`${label} no es válido.`);
  }
  return value;
}

export function optId(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return reqId(value);
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new ValidationError(`${label} no es una opción válida.`);
}

/** URL http(s) válida, o null. Evita guardar `javascript:` en Ajustes. */
export function optUrl(value: unknown): string | null {
  const text = optText(value, 500);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ValidationError("La dirección debe empezar con http:// o https://");
    }
    return url.toString();
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("La dirección web no es válida.");
  }
}

/** Zona horaria reconocida por el sistema (se usa para el día operativo). */
export function reqTimezone(value: unknown): string {
  const text = reqText(value, "La zona horaria", 64);
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: text });
    return text;
  } catch {
    throw new ValidationError(
      `"${text}" no es una zona horaria válida (ejemplo: America/Mexico_City).`,
    );
  }
}

/* ------------------------------- Ejecución ---------------------------------- */

/**
 * Ejecuta una mutación: primero autoriza, luego aplica el cambio y por último
 * devuelve el estado recién leído. Si algo falla, la interfaz recibe el mensaje
 * y conserva el estado que ya tenía.
 */
export async function run<T>(
  guard: () => Promise<Staff>,
  body: (staff: Staff) => Promise<T>,
): Promise<ActionResult<T>> {
  let staff: Staff;
  try {
    staff = await guard();
  } catch (error) {
    const described = describeError(error);
    return { ok: false, error: described.message, kind: described.kind };
  }

  try {
    const data = await body(staff);
    const state = await loadAppState(staff);
    revalidatePath("/", "layout");
    return { ok: true, state, data };
  } catch (error) {
    const described = describeError(error);
    return { ok: false, error: described.message, kind: described.kind };
  }
}

/** Lectura sin mutación: sólo trae el estado más reciente (sin revalidar rutas). */
export async function readState(
  guard: () => Promise<Staff>,
): Promise<ActionResult<undefined>> {
  try {
    const staff = await guard();
    return { ok: true, state: await loadAppState(staff), data: undefined };
  } catch (error) {
    const described = describeError(error);
    return { ok: false, error: described.message, kind: described.kind };
  }
}

export type { AppState };
