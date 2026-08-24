import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseServiceKey, supabaseStatus, supabaseUrl } from "./env";

/* ============================================================================
 * Cliente de Supabase para el servidor.
 *
 * Usa la llave `service_role`, que omite RLS. Por eso este módulo es
 * `server-only`: nunca puede llegar al navegador. Toda la autorización real
 * (quién puede leer o escribir qué) la aplica `lib/auth.ts` a partir de la
 * sesión de Clerk antes de tocar la base.
 * ========================================================================== */

export type Db = SupabaseClient<Database>;

let client: Db | null = null;

/** Error de configuración: la interfaz lo convierte en un aviso legible. */
export class ConfigError extends Error {
  readonly missing: string[];
  constructor(service: string, missing: string[]) {
    super(
      `${service} no está configurado. Falta definir: ${missing.join(", ")}.`,
    );
    this.name = "ConfigError";
    this.missing = missing;
  }
}

export function isSupabaseConfigured(): boolean {
  return supabaseStatus().ok;
}

export function db(): Db {
  const status = supabaseStatus();
  if (!status.ok) throw new ConfigError("Supabase", status.missing);

  if (!client) {
    client = createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "X-Client-Info": "tomomatcha-app" } },
    });
  }
  return client;
}

/**
 * Postgres devuelve `numeric` como cadena para no perder precisión.
 * Todos los importes de la aplicación pasan por aquí.
 */
export function num(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/** Lanza el error de Supabase con contexto para que el log sea útil. */
export function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  context: string,
): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`${context}: sin datos`);
  }
  return result.data;
}
