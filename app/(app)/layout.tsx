import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  ConfigNotice,
  ErrorNotice,
  PendingNotice,
} from "@/components/setup-notice";
import { AuthError, loadStaff } from "@/lib/auth";
import { loadAppState } from "@/lib/data";
import { clerkStatus, supabaseStatus } from "@/lib/env";
import { StoreProvider } from "@/lib/store";
import { describeError } from "@/lib/action-utils";

/* ============================================================================
 * Puerta de entrada a la operación.
 *
 * Orden de comprobaciones, de fuera hacia dentro:
 *   1. ¿Están las llaves de los servicios?   → pantalla de configuración
 *   2. ¿Hay sesión de Clerk?                 → a iniciar sesión
 *   3. ¿La cuenta está autorizada?           → pantalla de espera
 *   4. Todo bien                             → se carga el estado y se pinta
 * ========================================================================== */

// El punto de venta trabaja siempre con datos del momento.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerk = clerkStatus();
  const supabase = supabaseStatus();

  if (!clerk.ok || !supabase.ok) {
    const services = [];
    if (!supabase.ok) {
      services.push({
        name: "Supabase (base de datos)",
        missing: supabase.missing,
        hint: "Panel de Supabase → Project Settings → API. La URL del proyecto y la llave service_role.",
      });
    }
    if (!clerk.ok) {
      services.push({
        name: "Clerk (autenticación)",
        missing: clerk.missing,
        hint: "Panel de Clerk → API Keys. La llave publishable y la secret de la aplicación de TomoMatcha.",
      });
    }
    return <ConfigNotice services={services} />;
  }

  let staff;
  try {
    staff = await loadStaff();
  } catch (error) {
    return <ErrorNotice message={describeError(error).message} />;
  }

  if (!staff) redirect("/sign-in");

  if (!staff.active) {
    return <PendingNotice email={staff.email} name={staff.fullName} />;
  }

  try {
    const state = await loadAppState(staff);
    return (
      <StoreProvider initialState={state}>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    );
  } catch (error) {
    if (error instanceof AuthError) redirect("/sign-in");
    return <ErrorNotice message={describeError(error).message} />;
  }
}
