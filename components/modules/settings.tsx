"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { shortDate, time } from "@/lib/format";
import { FeatureFlags } from "@/lib/types";
import { AccessGate, Button, Card, DemoTag, PageHeader, Toggle } from "@/components/ui";

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
    desc: "Descuento automático por receta, alertas de nivel mínimo y ajustes de stock.",
  },
  {
    key: "lealtad",
    emoji: "💚",
    name: "Lealtad y clientes",
    desc: "Tarjeta digital con QR, puntos por compra y canjes. También controla el selector de cliente en el punto de venta.",
  },
  {
    key: "resenasGoogle",
    emoji: "⭐",
    name: "Reseñas de Google",
    desc: "Resumen de reseñas en Inicio y Clientes. Todo simulado, sin conexión real a Google.",
  },
  {
    key: "mercadoPago",
    emoji: "💳",
    name: "Pagos con Mercado Pago",
    desc: "Muestra la opción de cobro simulado con Mercado Pago en el punto de venta. Sin transacciones reales.",
  },
];

export function SettingsModule() {
  const { state, setFlag, resetDemo, notify } = useStore();
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (state.role === "empleado") return <AccessGate module="Ajustes" />;

  const handleFlag = (key: keyof FeatureFlags, name: string, value: boolean) => {
    setFlag(key, value);
    notify("Módulo actualizado", `${name} ${value ? "encendido" : "apagado"}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración · módulos y demo"
        title="Ajustes"
        desc="Enciende o apaga módulos completos y controla los datos de la demo. Todo es local y reversible: perfecto para explorar sin miedo."
        actions={<DemoTag />}
      />

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
                onChange={(value) => handleFlag(mod.key, mod.name, value)}
                label={mod.name}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Los módulos apagados muestran un aviso claro y se pueden volver a encender aquí mismo.
        </p>
      </Card>

      {/* --------------------------- Perfiles de la demo ---------------------------- */}
      <Card>
        <p className="eyebrow">Perfiles de la demo</p>
        <h2 className="display mt-1 text-xl text-ink">Dos formas de recorrer la app</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl2 border border-matcha/30 bg-matcha-mist p-4">
            <p className="text-sm font-extrabold text-ink">👑 Administrador</p>
            <p className="mt-1 text-xs text-muted">Acceso total a la operación:</p>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-5 text-ink">
              <li>
                <span className="font-extrabold text-matcha-deep">✓</span> Punto de venta y comandas
              </li>
              <li>
                <span className="font-extrabold text-matcha-deep">✓</span> Inventario y productos
              </li>
              <li>
                <span className="font-extrabold text-matcha-deep">✓</span> Reportes, clientes y corte de caja
              </li>
              <li>
                <span className="font-extrabold text-matcha-deep">✓</span> Estos ajustes
              </li>
            </ul>
          </div>
          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="text-sm font-extrabold text-ink">🧑‍🍳 Empleado</p>
            <p className="mt-1 text-xs text-muted">Solo lo necesario para la barra:</p>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-5 text-ink">
              <li>
                <span className="font-extrabold text-matcha-deep">✓</span> Punto de venta
              </li>
              <li>
                <span className="font-extrabold text-matcha-deep">✓</span> Comandas
              </li>
              <li>
                <span aria-hidden>🔒</span> El resto se bloquea con un aviso claro
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Cambia de perfil desde la barra superior cuando quieras. No hay contraseñas porque es una demo.
        </p>
      </Card>

      {/* ----------------------------- Datos de la demo ----------------------------- */}
      <Card>
        <p className="eyebrow">Datos de la demo</p>
        <h2 className="display mt-1 text-xl text-ink">Lo que vive en este navegador</h2>
        <dl className="mt-2 divide-y divide-line text-sm">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-muted">Datos generados</dt>
            <dd className="font-extrabold text-ink">
              {shortDate(state.seededAt)} · {time(state.seededAt)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-muted">Productos</dt>
            <dd className="font-extrabold text-ink">{state.products.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-muted">Ventas de ejemplo</dt>
            <dd className="font-extrabold text-ink">{state.orders.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-muted">Clientes</dt>
            <dd className="font-extrabold text-ink">{state.customers.length}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl2 border border-danger/25 bg-danger/5 p-4">
          {confirmingReset ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-danger">
                ¿Seguro? Se pierde lo que probaste.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    resetDemo();
                    setConfirmingReset(false);
                  }}
                >
                  Sí, restablecer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingReset(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-ink">Empezar de cero</p>
                <p className="mt-0.5 text-xs text-muted">
                  Regresa productos, ventas, clientes e inventario a su estado inicial.
                </p>
              </div>
              <Button size="sm" variant="danger" onClick={() => setConfirmingReset(true)}>
                Restablecer todos los datos
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          Todo vive en este dispositivo (localStorage); nada se envía a internet.
        </p>
      </Card>

      {/* --------------------------- Acerca de esta demo ---------------------------- */}
      <Card className="bg-ink text-paper">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-matcha-light">
            Acerca de esta demo
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-matcha-light/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-matcha-light">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-matcha-light" aria-hidden />
            Demo · datos simulados
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/80">
          TomoMatcha está construida con Next.js para validar el alcance de la primera etapa del
          sistema: punto de venta, comandas, inventario, lealtad y reportes en un mismo flujo. Los
          pagos, las reseñas y los avisos de WhatsApp son simulados, sin conexión a servicios
          reales. El proyecto está listo para desplegarse en Vercel cuando arranque la siguiente
          etapa.
        </p>
      </Card>
    </div>
  );
}
