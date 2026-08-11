"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { shortDate } from "@/lib/format";
import { loyaltyTier } from "@/lib/types";
import { Icons } from "@/components/icons";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  cx,
  DemoTag,
  EmptyState,
  FakeQr,
  FlagGate,
  PageHeader,
  Stat,
} from "@/components/ui";

const AVATAR_STYLES = [
  "bg-matcha-light text-matcha-deep",
  "bg-cream text-ink",
  "bg-amber/15 text-amber",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function tierTone(tierName: string): "ink" | "matcha" | "neutral" {
  if (tierName === "Ceremonial") return "ink";
  if (tierName === "Hoja") return "matcha";
  return "neutral";
}

export function CustomersModule() {
  const { state, addPoints, redeemReward, notify } = useStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (state.role === "empleado") return <AccessGate module="Clientes y lealtad" />;
  if (!state.flags.lealtad)
    return (
      <FlagGate
        module="Clientes y lealtad"
        detail="El programa de lealtad está apagado en Ajustes. Enciéndelo para ver clientes, puntos y la tarjeta digital."
      />
    );

  const customers = state.customers;
  const totalPoints = customers.reduce((sum, c) => sum + c.points, 0);
  const totalVisits = customers.reduce((sum, c) => sum + c.visits, 0);

  // Nivel más común entre los clientes registrados
  const tierCounts = new Map<string, number>();
  for (const c of customers) {
    const name = loyaltyTier(c.points).name;
    tierCounts.set(name, (tierCounts.get(name) ?? 0) + 1);
  }
  let commonTier = "—";
  let commonCount = 0;
  tierCounts.forEach((count, name) => {
    if (count > commonCount) {
      commonCount = count;
      commonTier = name;
    }
  });

  const q = query.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c) =>
        [c.name, c.phone, c.email].some((field) => field.toLowerCase().includes(q)),
      )
    : customers;

  const selected = customers.find((c) => c.id === selectedId) ?? customers[0];
  const selectedTier = selected ? loyaltyTier(selected.points) : null;

  const avgRating =
    state.reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(state.reviews.length, 1);
  const roundedRating = Math.round(avgRating);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lealtad · tarjeta digital con QR"
        title="Clientes"
        desc="Cada cliente tiene su tarjeta digital con QR y suma 1 punto por cada peso de su compra (demo). Búscalo, súmale cortesías o canjea recompensas desde aquí."
        actions={<DemoTag />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clientes registrados" value={customers.length} hint="Base de la demo" />
        <Stat
          label="Puntos en circulación"
          value={totalPoints.toLocaleString("es-MX")}
          hint="1 punto por peso"
          tone="matcha"
        />
        <Stat
          label="Visitas acumuladas"
          value={totalVisits.toLocaleString("es-MX")}
          hint="Histórico simulado"
        />
        <Stat
          label="Nivel más común"
          value={commonTier}
          hint={commonCount ? `${commonCount} de ${customers.length} clientes` : "Sin clientes"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* ------------------------------ Lista ------------------------------ */}
        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">Buscar cliente</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo…"
              className="focus-ring w-full rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-ink shadow-card placeholder:text-muted/70"
            />
          </label>

          {q ? (
            <p className="px-1 text-xs font-bold text-muted">
              {filtered.length} de {customers.length} clientes
            </p>
          ) : null}

          {filtered.length ? (
            <div className="space-y-2.5">
              {filtered.map((c, i) => {
                const tier = loyaltyTier(c.points);
                const isSelected = selected?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    aria-pressed={isSelected}
                    className={cx(
                      "focus-ring card flex w-full items-center gap-3.5 p-4 text-left transition hover:border-matcha",
                      isSelected && "border-matcha bg-matcha-mist/60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cx(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold",
                        AVATAR_STYLES[i % AVATAR_STYLES.length],
                      )}
                    >
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-extrabold text-ink">{c.name}</span>
                        <Badge tone={tierTone(tier.name)}>{tier.name}</Badge>
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted">
                        {c.phone} · {c.visits} visitas · Última:{" "}
                        {c.lastVisit ? shortDate(c.lastVisit) : "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="display block text-xl text-ink">
                        {c.points.toLocaleString("es-MX")}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted">
                        pts
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              emoji="🔍"
              title="Sin resultados"
              desc="No encontramos clientes con ese nombre, teléfono o correo. Prueba con otro término."
              action={
                <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
                  Limpiar búsqueda
                </Button>
              }
            />
          )}
        </div>

        {/* --------------------------- Panel derecho --------------------------- */}
        <div className="space-y-5 self-start lg:sticky lg:top-24">
          {selected && selectedTier ? (
            <>
              {/* Tarjeta de lealtad */}
              <div className="relative overflow-hidden rounded-xl3 bg-ink p-6 text-paper shadow-lift">
                <div
                  aria-hidden
                  className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-matcha-deep/40 blur-2xl"
                />
                <div className="relative">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-matcha-light">
                    TomoMatcha · Lealtad
                  </p>
                  <p className="display mt-2 text-2xl">{selected.name}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p>
                      <span className="display text-4xl">
                        {selected.points.toLocaleString("es-MX")}
                      </span>{" "}
                      <span className="text-sm text-paper/70">puntos</span>
                    </p>
                    <Badge tone={tierTone(selectedTier.name)} className="ring-1 ring-paper/25">
                      {selectedTier.name}
                    </Badge>
                  </div>

                  {selectedTier.next !== null ? (
                    <div className="mt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-matcha-light"
                          style={{
                            width: `${Math.min((selected.points / selectedTier.next) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-paper/70">
                        Te faltan{" "}
                        {(selectedTier.next - selected.points).toLocaleString("es-MX")} pts para
                        nivel {loyaltyTier(selectedTier.next).name}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-paper/70">Nivel máximo 🌿</p>
                  )}

                  <div className="mt-5 flex justify-center rounded-xl2 bg-white p-3">
                    <FakeQr seed={selected.id} className="h-28 w-28" />
                  </div>
                  <p className="mt-2.5 text-center text-[10px] leading-4 text-paper/60">
                    QR de demostración · en producción abre el perfil del cliente al escanear
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <Card>
                <p className="eyebrow">Acciones rápidas</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="matcha"
                    onClick={() => addPoints(selected.id, 50, "Cortesía demo aplicada")}
                  >
                    Sumar 50 pts (cortesía)
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={selected.points < 500}
                    onClick={() =>
                      redeemReward(selected.id, 500, `Bebida gratis para ${selected.name}`)
                    }
                  >
                    Canjear bebida · 500 pts
                  </Button>
                  {selected.points < 500 ? (
                    <p className="text-xs text-muted">
                      Le faltan {(500 - selected.points).toLocaleString("es-MX")} pts para canjear
                      su bebida.
                    </p>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  Captura teléfono y correo para futuras campañas de WhatsApp. Todo es simulado:
                  en la demo no se envía ningún mensaje real.
                </p>
              </Card>
            </>
          ) : (
            <EmptyState
              emoji="🪪"
              title="Sin clientes en la demo"
              desc="Restablece la demo desde Ajustes para volver a cargar la base de clientes de ejemplo."
            />
          )}

          {/* Reseñas de Google */}
          {state.flags.resenasGoogle ? (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">Reseñas de Google · demo</p>
                <span className="flex items-center gap-1.5">
                  <span className="display text-xl text-ink">{avgRating.toFixed(1)}</span>
                  <span
                    className="flex"
                    role="img"
                    aria-label={`Calificación promedio ${avgRating.toFixed(1)} de 5 estrellas`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icons.star
                        key={star}
                        className={cx(
                          "h-4 w-4",
                          star <= roundedRating ? "text-amber" : "text-ink/15",
                        )}
                      />
                    ))}
                  </span>
                </span>
              </div>

              <ul className="mt-4 space-y-3.5">
                {state.reviews.map((r) => (
                  <li key={r.id} className="border-t border-line pt-3.5 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-ink">{r.author}</p>
                      <p className="shrink-0 text-xs text-muted">{r.date}</p>
                    </div>
                    <p
                      className="text-xs text-amber"
                      role="img"
                      aria-label={`${r.rating} de 5 estrellas`}
                    >
                      {"★".repeat(r.rating)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">{r.text}</p>
                  </li>
                ))}
              </ul>

              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() =>
                  notify("Demo", "En producción esto abre el perfil de Google Maps del negocio.")
                }
              >
                Abrir página de reseñas
              </Button>
              <p className="mt-3 text-xs leading-5 text-muted">
                En producción, el cliente escanea un QR en barra para dejar su reseña directo en
                Google.
              </p>
            </Card>
          ) : (
            <Card>
              <p className="eyebrow">Reseñas de Google</p>
              <p className="mt-2 text-sm text-muted">
                Las reseñas de Google están apagadas en Ajustes.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
