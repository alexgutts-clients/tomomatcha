import { NextResponse } from "next/server";
import { clerkStatus, r2Status, supabaseStatus } from "@/lib/env";

/* ============================================================================
 * Estado de las conexiones.
 *
 * Sirve para verificar un despliegue sin entrar a la aplicación y lo consulta
 * `npm run doctor`. Sólo reporta qué falta configurar: nunca devuelve el valor
 * de ninguna llave.
 * ========================================================================== */

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseStatus();
  const clerk = clerkStatus();
  const r2 = r2Status();

  const services = {
    supabase: { ok: supabase.ok, missing: supabase.missing },
    clerk: { ok: clerk.ok, missing: clerk.missing },
    r2: { ok: r2.ok, missing: r2.missing },
  };

  // R2 es opcional: sin él todo funciona, sólo no se pueden subir imágenes.
  const ready = supabase.ok && clerk.ok;

  return NextResponse.json(
    { ready, services, checkedAt: new Date().toISOString() },
    { status: ready ? 200 : 503 },
  );
}
