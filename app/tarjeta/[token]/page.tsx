import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, isSupabaseConfigured } from "@/lib/supabase";
import { loyaltyTier } from "@/lib/types";
import { SHOW_LEALTAD_UI } from "@/lib/feature-visibility";

/* ============================================================================
 * Tarjeta de lealtad del cliente · página pública.
 *
 * Es lo que abre el cliente en su teléfono al escanear el QR de su tarjeta. Se
 * llega por un token aleatorio de 24 caracteres, no por el id del cliente, y
 * sólo muestra lo suyo: nombre, puntos y nivel. Nunca teléfono ni correo, y no
 * hay forma de listar clientes desde aquí.
 * ========================================================================== */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi tarjeta · TomoMatcha",
  robots: { index: false, follow: false },
};

const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // La tarjeta pública está oculta mientras el módulo de lealtad no se muestre.
  if (!SHOW_LEALTAD_UI) notFound();

  if (!TOKEN_RE.test(token) || !isSupabaseConfigured()) notFound();

  const supabase = db();

  const [customer, settings] = await Promise.all([
    supabase
      .from("customers")
      .select("name, points, visits, since")
      .eq("card_token", token)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("business_name, branch_name, reward_cost, flag_lealtad")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (customer.error || !customer.data) notFound();
  if (settings.data && !settings.data.flag_lealtad) notFound();

  const { name, points, visits } = customer.data;
  const tier = loyaltyTier(points);
  const rewardCost = settings.data?.reward_cost ?? 500;
  const business = settings.data?.business_name ?? "TomoMatcha";
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const missingForReward = Math.max(0, rewardCost - points);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="relative overflow-hidden rounded-xl3 bg-ink p-7 text-paper shadow-lift">
          <div
            aria-hidden
            className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-matcha-deep/40 blur-2xl"
          />
          <div className="relative">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-matcha-light">
              {business} · Lealtad
            </p>
            <p className="display mt-2 text-3xl">{firstName}</p>

            <p className="mt-5">
              <span className="display text-5xl">
                {points.toLocaleString("es-MX")}
              </span>{" "}
              <span className="text-sm text-paper/70">puntos</span>
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-matcha-light px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink">
                Nivel {tier.name}
              </span>
              <span className="text-xs text-paper/60">
                {visits} {visits === 1 ? "visita" : "visitas"}
              </span>
            </div>

            {tier.next !== null ? (
              <div className="mt-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-matcha-light"
                    style={{
                      width: `${Math.min((points / tier.next) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-paper/70">
                  Te faltan {(tier.next - points).toLocaleString("es-MX")} puntos
                  para el nivel {loyaltyTier(tier.next).name}.
                </p>
              </div>
            ) : (
              <p className="mt-5 text-xs text-paper/70">Nivel máximo 🌿</p>
            )}
          </div>
        </div>

        <div className="card mt-4 p-5 text-sm leading-6 text-muted">
          {missingForReward === 0 ? (
            <p className="font-bold text-matcha-deep">
              ¡Ya puedes canjear una bebida! Muestra esta tarjeta en barra.
            </p>
          ) : (
            <p>
              Con <strong>{rewardCost.toLocaleString("es-MX")} puntos</strong>{" "}
              canjeas una bebida. Te faltan{" "}
              <strong>{missingForReward.toLocaleString("es-MX")}</strong>.
            </p>
          )}
          <p className="mt-3 text-xs">
            Muestra esta pantalla en la barra para acumular puntos en tu próxima
            compra.
          </p>
        </div>
      </div>
    </main>
  );
}
