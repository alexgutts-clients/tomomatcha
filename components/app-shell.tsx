"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useDerived, useStore } from "@/lib/store";
import { Role } from "@/lib/types";
import { longDate } from "@/lib/format";
import { Icons, IconName } from "./icons";
import { Button, cx, DemoTag, Modal, ToastViewport } from "./ui";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: IconName;
  employee: boolean;
}

const NAV: NavItem[] = [
  { href: "/inicio", label: "Inicio", short: "Inicio", icon: "inicio", employee: false },
  { href: "/pos", label: "Punto de venta", short: "Venta", icon: "pos", employee: true },
  { href: "/comandas", label: "Comandas", short: "Comandas", icon: "comandas", employee: true },
  { href: "/inventario", label: "Inventario", short: "Insumos", icon: "inventario", employee: false },
  { href: "/productos", label: "Productos", short: "Productos", icon: "productos", employee: false },
  { href: "/reportes", label: "Reportes", short: "Reportes", icon: "reportes", employee: false },
  { href: "/clientes", label: "Clientes y lealtad", short: "Clientes", icon: "clientes", employee: false },
  { href: "/corte", label: "Corte de caja", short: "Corte", icon: "corte", employee: false },
  { href: "/ajustes", label: "Ajustes", short: "Ajustes", icon: "ajustes", employee: false },
];

const WELCOME_KEY = "tomomatcha-welcome-v1";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, setRole, resetDemo } = useStore();
  const { activeOrders, lowStock, cashClosedToday } = useDerived();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(WELCOME_KEY)) setWelcomeOpen(true);
    } catch {
      /* sin almacenamiento: no mostrar tour */
    }
  }, []);

  const closeWelcome = () => {
    setWelcomeOpen(false);
    try {
      window.localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* ignorar */
    }
  };

  const isEmployee = state.role === "empleado";
  const badgeFor = (item: NavItem) => {
    if (item.href === "/comandas" && activeOrders.length > 0) return String(activeOrders.length);
    if (item.href === "/inventario" && lowStock.length > 0 && state.flags.inventario)
      return String(lowStock.length);
    return null;
  };

  const mobilePrimary = NAV.filter((n) => ["/inicio", "/pos", "/comandas"].includes(n.href));
  const mobileRest = NAV.filter((n) => !["/inicio", "/pos", "/comandas"].includes(n.href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      {/* ------------------------------ Sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col bg-ink text-paper lg:flex">
        <div className="px-6 pb-2 pt-7">
          <div className="flex items-center justify-between">
            <Link href="/inicio" className="focus-ring rounded-lg">
              <span className="display text-[21px] leading-none">
                Tomo<span className="text-matcha-light">Matcha</span>
              </span>
            </Link>
            <DemoTag />
          </div>
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-paper/40">
            Café · matcha · operación
          </p>
        </div>

        <nav className="scrollbar-slim mt-4 flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Navegación principal">
          {NAV.map((item) => {
            const Icon = Icons[item.icon];
            const active = pathname.startsWith(item.href);
            const locked = isEmployee && !item.employee;
            const badge = badgeFor(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-matcha-deep text-white shadow-pop"
                    : locked
                      ? "text-paper/35 hover:bg-white/5"
                      : "text-paper/75 hover:bg-white/8 hover:text-paper",
                )}
              >
                <Icon className={cx("shrink-0", active ? "text-matcha-light" : "text-paper/50 group-hover:text-paper/80")} />
                <span className="flex-1">{item.label}</span>
                {locked ? (
                  <span aria-label="Solo administración" title="Solo administración" className="text-[11px]">
                    🔒
                  </span>
                ) : badge ? (
                  <span className="rounded-full bg-matcha-light px-2 py-0.5 text-[10px] font-extrabold text-ink">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-5 text-xs text-paper/50">
          <p className="font-extrabold text-paper/90">Sucursal Roma Norte</p>
          <p className="mt-1">
            {cashClosedToday ? "Caja cerrada" : "Turno abierto"} · datos de ejemplo
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setWelcomeOpen(true)}
              className="focus-ring flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-bold text-paper/70 hover:border-matcha-light hover:text-paper"
            >
              <Icons.help className="h-3.5 w-3.5" /> Guía
            </button>
            <button
              onClick={() => setResetOpen(true)}
              className="focus-ring flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-bold text-paper/70 hover:border-matcha-light hover:text-paper"
            >
              <Icons.reset className="h-3.5 w-3.5" /> Reiniciar
            </button>
          </div>
        </div>
      </aside>

      {/* ----------------------------- Contenido ------------------------------ */}
      <div className="flex min-h-dvh flex-col lg:col-start-2">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="display text-lg lg:hidden">
                Tomo<span className="text-matcha-deep">Matcha</span>
              </span>
              <span className="hidden text-sm font-semibold capitalize text-muted lg:block">
                {longDate(new Date().toISOString())}
              </span>
              <span className="lg:hidden">
                <DemoTag />
              </span>
              <span className="hidden lg:block">
                <DemoTag label="Demo · sin conexiones reales" />
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <div
                className="flex rounded-full border border-line bg-white p-1"
                role="group"
                aria-label="Perfil de sesión"
              >
                {(
                  [
                    ["admin", "Administrador"],
                    ["empleado", "Empleado"],
                  ] as [Role, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setRole(value)}
                    aria-pressed={state.role === value}
                    className={cx(
                      "focus-ring rounded-full px-3 py-1.5 text-xs font-extrabold transition sm:px-4",
                      state.role === value
                        ? "bg-ink text-paper"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    <span className="sm:hidden">{value === "admin" ? "Admin" : "Empleado"}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {cashClosedToday ? (
            <div className="flex items-center justify-center gap-2 bg-amber/15 px-4 py-1.5 text-center text-xs font-bold text-amber">
              La caja de hoy está cerrada: el cobro está pausado.
              <Link href="/corte" className="underline underline-offset-2">
                Reabrir en Corte de caja
              </Link>
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ----------------------------- Nav móvil ------------------------------ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navegación compacta"
      >
        <div className="grid grid-cols-4">
          {mobilePrimary.map((item) => {
            const Icon = Icons[item.icon];
            const active = pathname.startsWith(item.href);
            const locked = isEmployee && !item.employee;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "focus-ring flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold",
                  active ? "text-matcha-deep" : locked ? "text-muted/40" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.short}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cx(
              "focus-ring flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold",
              mobileRest.some((i) => pathname.startsWith(i.href)) ? "text-matcha-deep" : "text-muted",
            )}
          >
            <Icons.menu className="h-5 w-5" />
            Más
          </button>
        </div>
      </nav>

      {/* ------------------------------- Sheets ------------------------------- */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Todos los módulos">
        <div className="grid grid-cols-2 gap-2">
          {NAV.map((item) => {
            const Icon = Icons[item.icon];
            const locked = isEmployee && !item.employee;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cx(
                  "focus-ring flex items-center gap-3 rounded-xl2 border border-line bg-white px-4 py-3.5 text-sm font-bold",
                  locked ? "text-muted/50" : "text-ink hover:border-matcha",
                )}
              >
                <Icon className="text-matcha-deep" />
                <span className="flex-1">{item.label}</span>
                {locked ? <span aria-label="Solo administración">🔒</span> : null}
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setMoreOpen(false); setWelcomeOpen(true); }}>
            Guía de la demo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setMoreOpen(false); setResetOpen(true); }}>
            Reiniciar demo
          </Button>
        </div>
      </Modal>

      <Modal open={welcomeOpen} onClose={closeWelcome} title={<>Bienvenido a la demo 🍵</>} wide>
        <div className="space-y-4 text-sm leading-6 text-ink">
          <p>
            Esta es una <strong>demo navegable de TomoMatcha</strong>: todo funciona con datos de
            ejemplo guardados en este dispositivo. No hay pagos reales, cuentas ni conexiones
            externas — puedes tocar todo sin miedo.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              ["🛒", "Cobra en Punto de venta", "Personaliza bebidas, aplica promos y cobra en efectivo o tarjeta simulada."],
              ["🔔", "Sigue la comanda", "Cada venta aparece en Comandas para avanzar de Nuevo a Entregado."],
              ["📦", "Mira el inventario", "Cada bebida descuenta matcha, leche y vasos según su receta."],
              ["👤", "Cambia de perfil", "Arriba a la derecha: Administrador ve todo, Empleado solo caja y comandas."],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="rounded-xl2 border border-line bg-white p-3.5">
                <p className="text-lg" aria-hidden>{emoji}</p>
                <p className="mt-1 font-extrabold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            ¿Quieres empezar de cero? Usa <strong>Reiniciar demo</strong> en el menú lateral (o en
            “Más” desde el móvil). En Ajustes puedes encender y apagar módulos completos.
          </p>
          <Button variant="matcha" className="w-full" onClick={closeWelcome}>
            Explorar la demo
          </Button>
        </div>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="¿Reiniciar la demo?">
        <p className="text-sm leading-6 text-muted">
          Se borran las ventas, ajustes de inventario y configuraciones que hayas hecho en este
          dispositivo, y los datos de ejemplo vuelven a su estado inicial.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setResetOpen(false)}>
            Conservar mis cambios
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              resetDemo();
              setResetOpen(false);
            }}
          >
            Sí, reiniciar
          </Button>
        </div>
      </Modal>

      <ToastViewport />
    </div>
  );
}
