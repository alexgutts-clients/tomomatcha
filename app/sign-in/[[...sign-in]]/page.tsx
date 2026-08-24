import { SignIn } from "@clerk/nextjs";
import { clerkStatus } from "@/lib/env";
import { ConfigNotice } from "@/components/setup-notice";

export const metadata = { title: "Entrar · TomoMatcha" };

export default function Page() {
  const clerk = clerkStatus();
  if (!clerk.ok) {
    return (
      <ConfigNotice
        services={[
          {
            name: "Clerk (autenticación)",
            missing: clerk.missing,
            hint: "Panel de Clerk → API Keys. Sin estas llaves nadie puede iniciar sesión.",
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
