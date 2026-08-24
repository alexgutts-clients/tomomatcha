import { SignUp } from "@clerk/nextjs";
import { clerkStatus } from "@/lib/env";
import { ConfigNotice } from "@/components/setup-notice";

export const metadata = { title: "Crear cuenta · TomoMatcha" };

export default function Page() {
  const clerk = clerkStatus();
  if (!clerk.ok) {
    return (
      <ConfigNotice
        services={[
          {
            name: "Clerk (autenticación)",
            missing: clerk.missing,
            hint: "Panel de Clerk → API Keys.",
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
        <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted">
          Al crear tu cuenta, un administrador tendrá que autorizarte antes de
          que puedas entrar a la caja.
        </p>
      </div>
      <SignUp />
    </main>
  );
}
