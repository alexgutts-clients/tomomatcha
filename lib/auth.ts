import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import type { Role, Staff } from "./types";
import type { StaffRow } from "./database.types";
import { bootstrapAdminEmails, clerkStatus } from "./env";
import { ConfigError, db } from "./supabase";

/* ============================================================================
 * Autenticación (Clerk) y autorización (tabla `staff`).
 *
 * Clerk dice *quién* eres. La tabla `staff` dice *qué* puedes hacer:
 *
 *   - El primer usuario que entra queda como administrador activo (arranque).
 *   - Los correos de BOOTSTRAP_ADMIN_EMAILS entran directo como administradores.
 *   - Cualquier otro usuario nuevo queda como empleado INACTIVO y ve la
 *     pantalla de "esperando autorización" hasta que un administrador lo active
 *     desde Ajustes. Esto importa: la instancia de Clerk puede estar compartida
 *     con otros proyectos, y nadie debe entrar a la caja solo por registrarse.
 * ========================================================================== */

export class AuthError extends Error {
  readonly kind: "sin-sesion" | "pendiente" | "sin-permiso";
  constructor(kind: AuthError["kind"], message: string) {
    super(message);
    this.name = "AuthError";
    this.kind = kind;
  }
}

export function toStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    email: row.email,
    fullName: row.full_name?.trim() || row.email || "Sin nombre",
    imageUrl: row.image_url,
    role: row.role as Role,
    active: row.active,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function isClerkConfigured(): boolean {
  return clerkStatus().ok;
}

/**
 * Devuelve el registro de `staff` del usuario con sesión, creándolo la primera
 * vez. `null` si no hay sesión.
 */
export async function loadStaff(): Promise<Staff | null> {
  if (!isClerkConfigured()) {
    throw new ConfigError("Clerk", clerkStatus().missing);
  }

  const { userId } = await auth();
  if (!userId) return null;

  const supabase = db();

  const existing = await supabase
    .from("staff")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`No se pudo leer el equipo: ${existing.error.message}`);
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    email ||
    "Sin nombre";

  if (existing.data) {
    // Mantenemos sincronizado el perfil visible sin tocar rol ni permisos.
    const patch: Partial<StaffRow> = { last_seen_at: new Date().toISOString() };
    if (email && email !== existing.data.email) patch.email = email;
    if (fullName !== existing.data.full_name) patch.full_name = fullName;
    if ((user?.imageUrl ?? null) !== existing.data.image_url) {
      patch.image_url = user?.imageUrl ?? null;
    }

    const updated = await supabase
      .from("staff")
      .update(patch)
      .eq("id", existing.data.id)
      .select("*")
      .single();

    return toStaff(updated.data ?? existing.data);
  }

  /* ------------------------------ Alta nueva ------------------------------- */

  const { count, error: countError } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new Error(`No se pudo leer el equipo: ${countError.message}`);
  }

  const isFirstEver = (count ?? 0) === 0;
  const isBootstrapAdmin =
    !!email && bootstrapAdminEmails.includes(email.toLowerCase());
  const promote = isFirstEver || isBootstrapAdmin;

  const inserted = await supabase
    .from("staff")
    .upsert(
      {
        clerk_user_id: userId,
        email,
        full_name: fullName,
        image_url: user?.imageUrl ?? null,
        role: promote ? "admin" : "empleado",
        active: promote,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "clerk_user_id" },
    )
    .select("*")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(
      `No se pudo registrar al usuario: ${inserted.error?.message ?? "sin datos"}`,
    );
  }

  return toStaff(inserted.data);
}

/** Igual que `loadStaff`, pero exige sesión y cuenta activa. */
export async function requireStaff(): Promise<Staff> {
  const staff = await loadStaff();
  if (!staff) {
    throw new AuthError("sin-sesion", "Necesitas iniciar sesión.");
  }
  if (!staff.active) {
    throw new AuthError(
      "pendiente",
      "Tu cuenta todavía no ha sido autorizada por un administrador.",
    );
  }
  return staff;
}

export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "admin") {
    throw new AuthError(
      "sin-permiso",
      "Esta acción es solo para administradores.",
    );
  }
  return staff;
}
