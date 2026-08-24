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
