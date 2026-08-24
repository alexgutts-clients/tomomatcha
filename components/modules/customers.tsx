"use client";

import { useEffect, useState } from "react";
import {
  addPoints,
  archiveCustomer,
  redeemReward,
  saveCustomer,
  type CustomerInput,
} from "@/lib/actions";
import { useStore } from "@/lib/store";
import { shortDate } from "@/lib/format";
import { loyaltyTier } from "@/lib/types";
import { Icons } from "@/components/icons";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  FlagGate,
  Input,
  Modal,
  PageHeader,
  QrCode,
  Stat,
  Textarea,
  cx,
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

const EMPTY_CUSTOMER: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  notes: "",
};

export function CustomersModule() {
  const { state, submit, busy } = useStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerInput | null>(null);
  const [origin, setOrigin] = useState("");

  // La URL del QR se arma en el navegador para que funcione en cualquier
  // dominio (local, vista previa o producción) sin configurar nada.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (state.role === "empleado") return <AccessGate module="Clientes y lealtad" />;
  if (!state.flags.lealtad) {
    return (
      <FlagGate
        module="Clientes y lealtad"
        detail="El programa de lealtad está apagado en Ajustes. Enciéndelo para registrar clientes, acumular puntos y usar la tarjeta digital."
      />
    );
  }

  const customers = state.customers;
  const totalPoints = customers.reduce((sum, c) => sum + c.points, 0);
  const totalVisits = customers.reduce((sum, c) => sum + c.visits, 0);
  const rewardCost = state.settings.rewardCost;

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
        [c.name, c.phone, c.email].some((field) =>
          field.toLowerCase().includes(q),
        ),
      )
    : customers;

  const selected = customers.find((c) => c.id === selectedId) ?? filtered[0];
  const selectedTier = selected ? loyaltyTier(selected.points) : null;
  const cardUrl = selected && origin ? `${origin}/tarjeta/${selected.cardToken}` : "";

  const submitForm = async () => {
    if (!form) return;
    const saved = await submit(() => saveCustomer(form), {
      title: form.id ? "Cliente actualizado" : "Cliente registrado",
      detail: form.name,
    });
    if (saved) {
      setForm(null);
      if (!form.id) setSelectedId(saved);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lealtad · tarjeta digital con QR"
        title="Clientes"
        desc={`Cada cliente suma ${state.settings.pointsPerCurrency} punto${state.settings.pointsPerCurrency === 1 ? "" : "s"} por cada peso de compra y tiene su tarjeta digital con QR escaneable.`}
        actions={
          <Button variant="matcha" onClick={() => setForm({ ...EMPTY_CUSTOMER })}>
            + Nuevo cliente
          </Button>
        }
      />

      {!customers.length ? (
        <EmptyState
          emoji="🪪"
          title="Todavía no hay clientes"
          desc="Registra al primero desde aquí o directo en la caja al cobrar. Cada uno recibe su tarjeta con QR para acumular puntos."
          action={
            <Button variant="matcha" onClick={() => setForm({ ...EMPTY_CUSTOMER })}>
              Registrar cliente
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Clientes registrados"
              value={customers.length}
              hint="Programa de lealtad activo"
            />
            <Stat
              label="Puntos en circulación"
              value={totalPoints.toLocaleString("es-MX")}
              hint={`Canje desde ${rewardCost.toLocaleString("es-MX")} pts`}
              tone="matcha"
            />
            <Stat
              label="Visitas acumuladas"
              value={totalVisits.toLocaleString("es-MX")}
              hint="Compras con cliente identificado"
            />
            <Stat
              label="Nivel más común"
              value={commonTier}
              hint={
                commonCount
                  ? `${commonCount} de ${customers.length} clientes`
                  : "Sin clientes"
              }
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            {/* ------------------------------ Lista ------------------------------ */}
            <div className="space-y-3">
              <label className="block">
                <span className="sr-only">Buscar cliente</span>
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o correo…"
                  className="rounded-full px-5 py-3"
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
                            <span className="truncate text-sm font-extrabold text-ink">
                              {c.name}
                            </span>
                            <Badge tone={tierTone(tier.name)}>{tier.name}</Badge>
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted">
                            {c.phone || c.email || "Sin contacto"} · {c.visits}{" "}
                            {c.visits === 1 ? "visita" : "visitas"} · Última:{" "}
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
                  desc="No encontramos clientes con ese nombre, teléfono o correo."
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
                  <div className="relative overflow-hidden rounded-xl3 bg-ink p-6 text-paper shadow-lift">
                    <div
                      aria-hidden
                      className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-matcha-deep/40 blur-2xl"
                    />
                    <div className="relative">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-matcha-light">
                        {state.settings.businessName} · Lealtad
                      </p>
                      <p className="display mt-2 text-2xl">{selected.name}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p>
                          <span className="display text-4xl">
                            {selected.points.toLocaleString("es-MX")}
                          </span>{" "}
                          <span className="text-sm text-paper/70">puntos</span>
                        </p>
                        <Badge
                          tone={tierTone(selectedTier.name)}
                          className="ring-1 ring-paper/25"
                        >
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
                            Le faltan{" "}
                            {(selectedTier.next - selected.points).toLocaleString(
                              "es-MX",
                            )}{" "}
                            pts para nivel {loyaltyTier(selectedTier.next).name}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-paper/70">Nivel máximo 🌿</p>
                      )}

                      <div className="mt-5 flex justify-center rounded-xl2 bg-white p-3">
                        {cardUrl ? (
                          <QrCode
                            value={cardUrl}
                            className="h-28 w-28"
                            alt={`Código QR de la tarjeta de ${selected.name}`}
                          />
                        ) : (
                          <div className="h-28 w-28" />
                        )}
                      </div>
                      <p className="mt-2.5 text-center text-[10px] leading-4 text-paper/60">
                        Al escanearlo se abre la tarjeta del cliente con sus puntos
                      </p>
                    </div>
                  </div>

                  <Card>
                    <p className="eyebrow">Acciones</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Button
                        variant="matcha"
                        disabled={busy}
                        onClick={() =>
                          void submit(
                            () =>
                              addPoints(selected.id, 50, "Cortesía en barra"),
                            {
                              title: "Puntos agregados",
                              detail: `+50 pts a ${selected.name}`,
                            },
                          )
                        }
                      >
                        Sumar 50 pts (cortesía)
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy || selected.points < rewardCost}
                        onClick={() =>
                          void submit(
                            () =>
                              redeemReward(
                                selected.id,
                                rewardCost,
                                `Bebida de cortesía para ${selected.name}`,
                              ),
                            {
                              title: "Recompensa canjeada",
                              detail: `−${rewardCost} pts a ${selected.name}`,
                            },
                          )
                        }
                      >
                        Canjear bebida · {rewardCost} pts
                      </Button>
                      {selected.points < rewardCost ? (
                        <p className="text-xs text-muted">
                          Le faltan{" "}
                          {(rewardCost - selected.points).toLocaleString("es-MX")}{" "}
                          pts para canjear su bebida.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-1 border-t border-line pt-4 text-xs text-muted">
                      {selected.phone ? <p>📞 {selected.phone}</p> : null}
                      {selected.email ? <p>✉️ {selected.email}</p> : null}
                      <p>
                        Cliente desde {shortDate(`${selected.since}T12:00:00`)}
                      </p>
                      {selected.notes ? (
                        <p className="italic">«{selected.notes}»</p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm({
                            id: selected.id,
                            name: selected.name,
                            phone: selected.phone,
                            email: selected.email,
                            notes: selected.notes,
                          })
                        }
                      >
                        Editar datos
                      </Button>
                      <ConfirmButton
                        label="Dar de baja"
                        confirmLabel="Sí, dar de baja"
                        disabled={busy}
                        onConfirm={() =>
                          void submit(() => archiveCustomer(selected.id), {
                            title: "Cliente dado de baja",
                            detail: "Su historial de ventas se conserva.",
                          })
                        }
                      />
                    </div>
                  </Card>
                </>
              ) : null}

              {/* --------------------------- Reseñas de Google --------------------------- */}
              {state.flags.resenasGoogle ? (
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow">Reseñas de Google</p>
                    {state.settings.googleRating !== null ? (
                      <span className="flex items-center gap-1.5">
                        <span className="display text-xl text-ink">
                          {state.settings.googleRating.toFixed(1)}
                        </span>
                        <span
                          className="flex"
                          role="img"
                          aria-label={`Calificación ${state.settings.googleRating.toFixed(1)} de 5`}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Icons.star
                              key={star}
                              className={cx(
                                "h-4 w-4",
                                star <= Math.round(state.settings.googleRating ?? 0)
                                  ? "text-amber"
                                  : "text-ink/15",
                              )}
                            />
                          ))}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  {state.settings.googleReviewUrl ? (
                    <>
                      <div className="mt-4 flex justify-center rounded-xl2 border border-line bg-white p-4">
                        <QrCode
                          value={state.settings.googleReviewUrl}
                          className="h-32 w-32"
                          alt="Código QR para dejar una reseña en Google"
                        />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted">
                        Imprime este QR y ponlo en barra: al escanearlo, el cliente
                        llega directo a dejar su reseña.
                      </p>
                      <a
                        href={state.settings.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring mt-3 inline-flex items-center rounded-full border border-line bg-white px-4 py-2 text-xs font-extrabold text-ink hover:border-matcha"
                      >
                        Abrir la página de reseñas
                      </a>
                    </>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Pega el enlace de reseñas de tu negocio en{" "}
                      <strong>Ajustes</strong> y aquí aparecerá el QR listo para
                      imprimir.
                    </p>
                  )}
                </Card>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------ Alta y edición ------------------------------ */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar cliente" : "Nuevo cliente"}
      >
        {form ? (
          <div className="space-y-4">
            <Field label="Nombre">
              <Input
                autoFocus
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre y apellido"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono" hint="Se usa para identificarlo en barra">
                <Input
                  type="tel"
                  value={form.phone ?? ""}
                  maxLength={40}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="55 1234 5678"
                />
              </Field>
              <Field label="Correo" hint="Opcional">
                <Input
                  type="email"
                  value={form.email ?? ""}
                  maxLength={160}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@correo.com"
                />
              </Field>
            </div>
            <Field label="Notas" hint="Preferencias, alergias, lo que convenga">
              <Textarea
                rows={2}
                maxLength={500}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button
                variant="matcha"
                className="flex-1"
                disabled={busy || !form.name.trim()}
                onClick={() => void submitForm()}
              >
                {form.id ? "Guardar cambios" : "Registrar cliente"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
