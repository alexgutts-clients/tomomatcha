"use client";

import { useState } from "react";
import {
  removeLogo,
  removeStaff,
  saveSettings,
  seedCatalog,
  setFlag,
  setStaffActive,
  setStaffRole,
  type SettingsInput,
} from "@/lib/actions-admin";
import { CATALOG_SUMMARY } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { shortDate, time } from "@/lib/format";
import type { FeatureFlags, Role } from "@/lib/types";
import { SHOW_LEALTAD_UI } from "@/lib/feature-visibility";
import {
  AccessGate,
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  ImageUpload,
  Input,
  MediaImage,
  PageHeader,
  Select,
  Toggle,
} from "@/components/ui";

const MODULES: {
  key: keyof FeatureFlags;
  emoji: string;
  name: string;
  desc: string;
}[] = [
  {
    key: "inventario",
    emoji: "📦",
    name: "Inventario de insumos",
    desc: "Descuento automático por receta, alertas de nivel mínimo y bitácora de movimientos. Al apagarlo, las ventas dejan de descontar stock.",
  },
  {
    key: "resenasGoogle",
    emoji: "⭐",
    name: "Reseñas de Google",
    desc: "Muestra el QR para dejar reseña y la calificación del negocio en Inicio y Clientes.",
  },
  {
    key: "mercadoPago",
    emoji: "💳",
    name: "Pagos con Mercado Pago",
    desc: "Añade Mercado Pago como método de cobro. El registro es manual: la aplicación no procesa el pago, sólo lo contabiliza en el corte.",
  },
  // El módulo de lealtad está oculto temporalmente (ver SHOW_LEALTAD_UI).
  ...(SHOW_LEALTAD_UI
    ? [
        {
          key: "lealtad" as keyof FeatureFlags,
          emoji: "💚",
          name: "Lealtad y clientes",
          desc: "Tarjeta digital con QR, puntos por compra y canjes. También controla el selector de cliente en el punto de venta.",
        },
      ]
    : []),
];

const TIMEZONES = [
  "America/Mexico_City",
  "America/Tijuana",
  "America/Monterrey",
  "America/Cancun",
  "America/Hermosillo",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "Europe/Madrid",
];

export function SettingsModule() {
  const { state, currency, submit, busy } = useStore();

  const [form, setForm] = useState<SettingsInput>({
    businessName: state.settings.businessName,
    branchName: state.settings.branchName,
    timezone: state.settings.timezone,
    cashFloat: state.settings.cashFloat,
    pointsPerCurrency: state.settings.pointsPerCurrency,
    rewardCost: state.settings.rewardCost,
    googleReviewUrl: state.settings.googleReviewUrl ?? "",
    googleRating: state.settings.googleRating,
    googleReviewsCount: state.settings.googleReviewsCount,
  });

  if (state.role === "empleado") return <AccessGate module="Ajustes" />;

  const catalogEmpty = state.products.length === 0;
  const pending = state.staff.filter((s) => !s.active);
  const active = state.staff.filter((s) => s.active);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración del negocio"
        title="Ajustes"
        desc="Datos del negocio, módulos activos, equipo con acceso y estado de las conexiones."
      />

      {/* -------------------------- Equipo pendiente -------------------------- */}
      {pending.length ? (
        <Card className="border-amber/40 bg-amber/5">
          <p className="text-sm font-extrabold text-ink">
            {pending.length} cuenta{pending.length === 1 ? "" : "s"} esperando
            autorización
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Nadie entra a la operación sólo por registrarse: tienes que activarlo
            aquí abajo, en la sección de Equipo.
          </p>
        </Card>
      ) : null}

      {/* --------------------------- Datos del negocio --------------------------- */}
      <Card>
        <p className="eyebrow">Datos del negocio</p>
        <h2 className="display mt-1 text-xl text-ink">Identidad y operación</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Sucursal">
            <Input
              value={form.branchName}
              maxLength={120}
              onChange={(e) => setForm({ ...form, branchName: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Zona horaria"
            hint="Define el día operativo: de esto depende el corte de caja"
          >
            <Select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {[
                ...new Set([form.timezone, ...TIMEZONES]),
              ].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Fondo de caja (${currency})`} hint="Informativo en el corte">
            <Input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={form.cashFloat}
              onChange={(e) =>
                setForm({ ...form, cashFloat: Number(e.target.value) })
              }
            />
          </Field>
        </div>

        {/* Ajustes de puntos: ocultos junto con el módulo de lealtad. */}
        {SHOW_LEALTAD_UI ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Puntos por peso"
              hint="1 = un punto por cada peso de compra"
            >
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={form.pointsPerCurrency}
                onChange={(e) =>
                  setForm({ ...form, pointsPerCurrency: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Puntos para canjear una bebida">
              <Input
                type="number"
                min={1}
                step="1"
                inputMode="numeric"
                value={form.rewardCost}
                onChange={(e) =>
                  setForm({ ...form, rewardCost: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        ) : null}

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
            Reseñas de Google
          </p>
          <div className="mt-2 grid gap-4">
            <Field
              label="Enlace para dejar reseña"
              hint="Perfil de empresa de Google → Pedir reseñas → copiar enlace. Con esto se genera el QR de barra."
            >
              <Input
                type="url"
                value={form.googleReviewUrl ?? ""}
                maxLength={500}
                placeholder="https://g.page/r/…/review"
                onChange={(e) =>
                  setForm({ ...form, googleReviewUrl: e.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Calificación actual" hint="De 0 a 5 (opcional)">
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  inputMode="decimal"
                  value={form.googleRating ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      googleRating:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Número de reseñas" hint="Opcional">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  inputMode="numeric"
                  value={form.googleReviewsCount ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      googleReviewsCount:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs leading-5 text-muted">
            Los cambios aplican para todo el equipo en cuanto guardas.
          </p>
          <Button
            variant="matcha"
            disabled={busy}
            onClick={() =>
              void submit(() => saveSettings(form), {
                title: "Ajustes guardados",
              })
            }
          >
            Guardar ajustes
          </Button>
        </div>
      </Card>

      {/* -------------------------------- Logo -------------------------------- */}
      <Card>
        <p className="eyebrow">Logo del negocio</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl2 border border-line bg-white text-3xl">
            <MediaImage
              objectKey={state.settings.logoKey}
              alt="Logo del negocio"
              className="h-full w-full object-contain"
              fallback={<span aria-hidden>🍵</span>}
            />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <ImageUpload
              target={{ purpose: "logo" }}
              label={state.settings.logoKey ? "Cambiar logo" : "Subir logo"}
            />
            {state.settings.logoKey ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void submit(() => removeLogo(), { title: "Logo quitado" })
                }
              >
                Quitar
              </Button>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          Los archivos se guardan en Cloudflare R2, no en la base de datos: así las
          imágenes pesadas no encarecen ni frenan la operación.
        </p>
      </Card>

      {/* ------------------------- Módulos de la aplicación ------------------------- */}
      <Card>
        <p className="eyebrow">Módulos de la aplicación</p>
        <h2 className="display mt-1 text-xl text-ink">Qué se ve y qué no</h2>
        <div className="mt-2 divide-y divide-line">
          {MODULES.map((mod) => (
            <div key={mod.key} className="flex items-start gap-3 py-4">
              <span className="mt-0.5 text-xl" aria-hidden>
                {mod.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-ink">{mod.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{mod.desc}</p>
              </div>
              <Toggle
                checked={state.flags[mod.key]}
                disabled={busy}
                onChange={(value) =>
                  void submit(() => setFlag(mod.key, value), {
                    title: "Módulo actualizado",
                    detail: `${mod.name} ${value ? "encendido" : "apagado"}`,
                  })
                }
                label={mod.name}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* ----------------------------- Catálogo inicial ----------------------------- */}
      {catalogEmpty ? (
        <Card className="border-matcha/40 bg-matcha-mist">
          <p className="eyebrow">Arranque</p>
          <h2 className="display mt-1 text-xl text-ink">Catálogo inicial sugerido</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Carga la carta base de TomoMatcha para no teclear todo el primer día:{" "}
            <strong>{CATALOG_SUMMARY.products} productos</strong>,{" "}
            <strong>{CATALOG_SUMMARY.ingredients} insumos</strong> con sus recetas,{" "}
            {CATALOG_SUMMARY.milks} leches y {CATALOG_SUMMARY.extras} extras. Todo
            queda editable, y las existencias arrancan en cero para que captures el
            inventario real contando la barra.
          </p>
          <div className="mt-4">
            <Button
              variant="matcha"
              disabled={busy}
              onClick={() =>
                void submit(() => seedCatalog(), {
                  title: (data) => `${data.products} productos cargados`,
                  detail: "Ya puedes ajustar precios, recetas y existencias.",
                })
              }
            >
              {busy ? "Cargando…" : "Cargar catálogo inicial"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="eyebrow">Catálogo</p>
          <dl className="mt-2 divide-y divide-line text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-muted">Productos</dt>
              <dd className="font-extrabold text-ink">{state.products.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-muted">Insumos</dt>
              <dd className="font-extrabold text-ink">
                {state.ingredients.length}
              </dd>
            </div>
            {SHOW_LEALTAD_UI ? (
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-muted">Clientes de lealtad</dt>
                <dd className="font-extrabold text-ink">
                  {state.customers.length}
                </dd>
              </div>
            ) : null}
            {state.settings.catalogSeededAt ? (
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-muted">Catálogo inicial cargado</dt>
                <dd className="font-extrabold text-ink">
                  {shortDate(state.settings.catalogSeededAt)} ·{" "}
                  {time(state.settings.catalogSeededAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>
      )}

      {/* ---------------------------------- Equipo ---------------------------------- */}
      <Card>
        <p className="eyebrow">Equipo</p>
        <h2 className="display mt-1 text-xl text-ink">Quién puede entrar</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
          Las cuentas se crean iniciando sesión con Clerk, pero no tienen acceso
          hasta que las actives aquí. Los administradores ven todo; los empleados
          sólo Punto de venta y Comandas.
        </p>

        <div className="mt-4 space-y-2.5">
          {[...pending, ...active].map((member) => {
            const isMe = member.id === state.me.id;
            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl2 border border-line bg-paper px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink">
                    <span className="truncate">{member.fullName}</span>
                    {isMe ? <Badge tone="matcha">Tú</Badge> : null}
                    {!member.active ? <Badge tone="amber">Pendiente</Badge> : null}
                  </p>
                  {member.email ? (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {member.email}
                    </p>
                  ) : null}
                </div>

                <Select
                  aria-label={`Rol de ${member.fullName}`}
                  value={member.role}
                  disabled={busy || isMe}
                  onChange={(e) =>
                    void submit(
                      () => setStaffRole(member.id, e.target.value as Role),
                      {
                        title: "Rol actualizado",
                        detail: `${member.fullName}: ${e.target.value}`,
                      },
                    )
                  }
                  className="w-auto"
                >
                  <option value="admin">Administrador</option>
                  <option value="empleado">Empleado</option>
                </Select>

                <div className="flex items-center gap-2">
                  {member.active ? (
                    <ConfirmButton
                      label="Desactivar"
                      confirmLabel="Sí"
                      variant="ghost"
                      disabled={busy || isMe}
                      onConfirm={() =>
                        void submit(() => setStaffActive(member.id, false), {
                          title: "Cuenta desactivada",
                          detail: member.fullName,
                        })
                      }
                    />
                  ) : (
                    <Button
                      variant="matcha"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void submit(() => setStaffActive(member.id, true), {
                          title: "Cuenta activada",
                          detail: `${member.fullName} ya puede entrar.`,
                        })
                      }
                    >
                      Activar
                    </Button>
                  )}
                  <ConfirmButton
                    label="Quitar"
                    confirmLabel="Sí, quitar"
                    disabled={busy || isMe}
                    onConfirm={() =>
                      void submit(() => removeStaff(member.id), {
                        title: "Usuario quitado",
                        detail: member.fullName,
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* -------------------------------- Conexiones -------------------------------- */}
      <Card>
        <p className="eyebrow">Conexiones</p>
        <h2 className="display mt-1 text-xl text-ink">Servicios del sistema</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          <li className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-bold text-ink">
                Base de datos · Supabase
              </span>
              <span className="text-xs text-muted">
                Productos, ventas, inventario, clientes y cortes
              </span>
            </span>
            <Badge tone="matcha">Conectado</Badge>
          </li>
          <li className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-bold text-ink">
                Autenticación · Clerk
              </span>
              <span className="text-xs text-muted">
                Inicio de sesión y cuentas del equipo
              </span>
            </span>
            <Badge tone="matcha">Conectado</Badge>
          </li>
          <li className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-bold text-ink">
                Imágenes y media · Cloudflare R2
              </span>
              <span className="text-xs text-muted">
                {state.media.configured
                  ? state.media.publicBase
                    ? "Con dominio público configurado"
                    : "Sirviendo por la aplicación (sin dominio público)"
                  : "Falta configurar las llaves de R2"}
              </span>
            </span>
            <Badge tone={state.media.configured ? "matcha" : "amber"}>
              {state.media.configured ? "Conectado" : "Pendiente"}
            </Badge>
          </li>
        </ul>
        {!state.media.configured ? (
          <p className="mt-3 rounded-xl2 border border-amber/30 bg-amber/5 p-4 text-xs leading-5 text-ink">
            Sin R2 todo funciona igual, pero no se pueden subir fotos de productos
            ni el logo. El paso a paso está en{" "}
            <code className="rounded bg-cream px-1 py-0.5">INSTRUCCIONES.md</code>.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
