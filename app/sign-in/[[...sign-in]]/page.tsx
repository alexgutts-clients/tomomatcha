import { SignIn } from "@clerk/nextjs";
import { clerkStatus } from "@/lib/env";
import { ConfigNotice } from "@/components/setup-notice";

export const metadata = { title: "Entrar · TomoMatcha" };

export default function Page() {
  const clerk = clerkStatus();
  if (!clerk.ok) {
    // El nombre exacto de cada variable va al registro del servidor, no a la
    // pantalla: aquí puede llegar cualquiera del equipo intentando entrar.
    console.error(
      "Configuración incompleta. Variables de entorno sin definir:",
      clerk.missing.join(", "),
    );
    return (
      <ConfigNotice
        services={[
          {
            name: "Inicio de sesión",
            hint: "Sin esta conexión nadie puede entrar a la aplicación, ni siquiera un administrador.",
          },
        ]}
      />
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-paper px-5 py-16">
      <div className="text-center">
        <p className="display text-3xl text-ink">
          Tomo<span className="text-matcha-deep">Matcha</span>
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted">
          Operación · café y matcha
        </p>
      </div>
      <SignIn />
    </main>
  );
}
