import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Assistant } from "@/components/assistant";
import {
  ConfigNotice,
  ErrorNotice,
  PendingNotice,
} from "@/components/setup-notice";
import { AuthError, loadStaff } from "@/lib/auth";
import { loadAppState } from "@/lib/data";
import { assistantStatus, clerkStatus, supabaseStatus } from "@/lib/env";
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
    /*
     * Qué variables faltan exactamente se registra aquí, en el servidor, y no
     * en la pantalla: quien la ve puede ser la persona de la barra, para quien
     * `NEXT_PUBLIC_…` no significa nada. Quien instala lo lee en el registro o
     * con `npm run doctor`, que las enumera con su nombre completo.
     */
    console.error(
      "Configuración incompleta. Variables de entorno sin definir:",
      [...supabase.missing, ...clerk.missing].join(", "),
    );

    const services = [];
    if (!supabase.ok) {
      services.push({
        name: "Base de datos",
        hint: "Es donde viven los productos, las ventas y el inventario. Sin esa conexión no se puede cobrar ni consultar nada.",
      });
    }
    if (!clerk.ok) {
      services.push({
        name: "Inicio de sesión",
        hint: "Es lo que identifica a cada persona del equipo y decide qué puede hacer dentro de la aplicación.",
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
        {/* Sin la llave del asistente el botón no aparece: mejor nada que un
            chat que sólo sabe decir que no funciona. */}
        {assistantStatus().ok ? <Assistant role={staff.role} /> : null}
      </StoreProvider>
    );
  } catch (error) {
    if (error instanceof AuthError) redirect("/sign-in");
    return <ErrorNotice message={describeError(error).message} />;
  }
}
