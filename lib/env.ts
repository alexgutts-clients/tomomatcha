/* ============================================================================
 * Lectura de variables de entorno.
 *
 * Ninguna dependencia falta hace caer la aplicación al arrancar: cada servicio
 * (base de datos, autenticación, almacenamiento) se reporta como configurado o
 * no, y la interfaz muestra un aviso claro con lo que falta. Así se puede
 * desplegar por partes y ver exactamente qué queda pendiente.
 * ========================================================================== */

function read(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : null;
}

export interface ServiceStatus {
  ok: boolean;
  missing: string[];
}

/* --------------------------------- Supabase --------------------------------- */

export const supabaseUrl = read("SUPABASE_URL") ?? read("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseServiceKey = read("SUPABASE_SERVICE_ROLE_KEY");

export function supabaseStatus(): ServiceStatus {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return { ok: missing.length === 0, missing };
}

/* ----------------------------------- Clerk ---------------------------------- */

export const clerkPublishableKey = read("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
export const clerkSecretKey = read("CLERK_SECRET_KEY");

export function clerkStatus(): ServiceStatus {
  const missing: string[] = [];
  if (!clerkPublishableKey) missing.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (!clerkSecretKey) missing.push("CLERK_SECRET_KEY");
  return { ok: missing.length === 0, missing };
}

/* -------------------------------- Cloudflare R2 ------------------------------ */

export const r2 = {
  accountId: read("R2_ACCOUNT_ID"),
  accessKeyId: read("R2_ACCESS_KEY_ID"),
  secretAccessKey: read("R2_SECRET_ACCESS_KEY"),
  bucket: read("R2_BUCKET") ?? "tomomatcha-media",
  /** Dominio público (r2.dev o dominio propio). Opcional. */
  publicBase: read("R2_PUBLIC_BASE_URL")?.replace(/\/+$/, "") ?? null,
  endpoint: read("R2_ENDPOINT"),
};

export function r2Status(): ServiceStatus {
  const missing: string[] = [];
  if (!r2.accountId && !r2.endpoint) missing.push("R2_ACCOUNT_ID");
  if (!r2.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!r2.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  return { ok: missing.length === 0, missing };
}

export function r2Endpoint(): string | null {
  if (r2.endpoint) return r2.endpoint.replace(/\/+$/, "");
  if (r2.accountId) return `https://${r2.accountId}.r2.cloudflarestorage.com`;
  return null;
}

/* --------------------------------- Asistente -------------------------------- */

/**
 * Asistente de ayuda dentro de la aplicación. Es opcional: sin la llave el
 * botón del chat simplemente no aparece y todo lo demás funciona igual.
 *
 * El modelo se cambia desde el panel del hosting, sin tocar código: el precio
 * y la calidad de los modelos baratos se mueven rápido, y no debería hacer
 * falta un despliegue para probar otro.
 */
export const assistant = {
  apiKey: read("OPENROUTER_API_KEY"),
  model: read("OPENROUTER_MODEL") ?? "deepseek/deepseek-v4.1-flash",
  /** Sólo para apuntar a un proxy o a un servidor de pruebas. */
  baseUrl:
    read("OPENROUTER_BASE_URL")?.replace(/\/+$/, "") ??
    "https://openrouter.ai/api/v1",
  /**
   * Cuánto «piensa» el modelo antes de contestar: `off`, `low`, `medium` o
   * `high`. Más razonamiento cuesta más y tarda más; con el manual completo a la
   * vista, `low` basta para no confundir quién puede hacer qué.
   */
  reasoning: (["off", "low", "medium", "high"] as const).find(
    (level) => level === read("OPENROUTER_REASONING")?.toLowerCase(),
  ) ?? "low",
};

export function assistantStatus(): ServiceStatus {
  const missing: string[] = [];
  if (!assistant.apiKey) missing.push("OPENROUTER_API_KEY");
  return { ok: missing.length === 0, missing };
}

/* --------------------------------- Arranque --------------------------------- */

/**
 * Correos que reciben rol de administrador activo en su primer inicio de
 * sesión. Sirve para el arranque: sin esto, el primer usuario en registrarse
 * queda como administrador y los demás quedan pendientes de aprobación.
 */
export const bootstrapAdminEmails = (read("BOOTSTRAP_ADMIN_EMAILS") ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const appUrl =
  read("NEXT_PUBLIC_APP_URL")?.replace(/\/+$/, "") ??
  (read("VERCEL_PROJECT_PRODUCTION_URL")
    ? `https://${read("VERCEL_PROJECT_PRODUCTION_URL")}`
    : null) ??
  (read("VERCEL_URL") ? `https://${read("VERCEL_URL")}` : null);
