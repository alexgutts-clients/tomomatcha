"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { useDerived, useStore } from "@/lib/store";
import { longDate } from "@/lib/format";
import { daysUntil } from "@/lib/types";
import { SHOW_LEALTAD_UI } from "@/lib/feature-visibility";
import { Icons, type IconName } from "./icons";
import { Badge, Modal, ToastViewport, cx } from "./ui";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: IconName;
  /** `true` si el perfil de empleado también puede entrar */
  employee: boolean;
}

const NAV: NavItem[] = [
  { href: "/inicio", label: "Inicio", short: "Inicio", icon: "inicio", employee: false },
  { href: "/pos", label: "Punto de venta", short: "Venta", icon: "pos", employee: true },
  { href: "/comandas", label: "Comandas", short: "Comandas", icon: "comandas", employee: true },
  { href: "/inventario", label: "Inventario", short: "Insumos", icon: "inventario", employee: false },
  { href: "/preparados", label: "Productos preparados", short: "Preparados", icon: "preparados", employee: false },
  { href: "/productos", label: "Productos", short: "Productos", icon: "productos", employee: false },
  { href: "/reportes", label: "Reportes", short: "Reportes", icon: "reportes", employee: false },
  // Clientes y lealtad está oculto temporalmente (ver SHOW_LEALTAD_UI).
  ...(SHOW_LEALTAD_UI
    ? [
        {
          href: "/clientes",
          label: "Clientes y lealtad",
          short: "Clientes",
          icon: "clientes",
          employee: false,
        } as NavItem,
      ]
    : []),
  { href: "/pedidos", label: "Administración de pedidos", short: "Pedidos", icon: "comandas", employee: false },
  { href: "/corte", label: "Corte de caja", short: "Corte", icon: "corte", employee: false },
  { href: "/ajustes", label: "Ajustes", short: "Ajustes", icon: "ajustes", employee: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { state, tz, busy } = useStore();
  const { activeOrders, lowStock, cashClosedToday } = useDerived();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isEmployee = state.role === "empleado";
  const pendingStaff = state.staff.filter((s) => !s.active).length;
  // Lotes que caducan hoy o mañana y todavía nadie ha revisado.
  const expiringSoon = state.preparedItems.filter(
    (item) =>
      !item.acknowledgedAt && daysUntil(item.expiresOn, state.todayKey) <= 1,
  ).length;

  const badgeFor = (item: NavItem) => {
    if (item.href === "/comandas" && activeOrders.length > 0) {
      return String(activeOrders.length);
    }
    if (
      item.href === "/inventario" &&
      lowStock.length > 0 &&
      state.flags.inventario
    ) {
      return String(lowStock.length);
    }
    if (item.href === "/preparados" && expiringSoon > 0) return String(expiringSoon);
    if (item.href === "/ajustes" && pendingStaff > 0) return String(pendingStaff);
    return null;
  };

  const mobilePrimary = NAV.filter((n) =>
    ["/inicio", "/pos", "/comandas"].includes(n.href),
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      {/* ------------------------------ Sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col bg-ink text-paper lg:flex">
        <div className="px-6 pb-2 pt-7">
          <Link href="/inicio" className="focus-ring rounded-lg">
            <span className="display text-xl leading-none">
              Tomo<span className="text-matcha-light">Matcha</span>
            </span>
          </Link>
          <p className="mt-2.5 truncate text-[10px] font-bold uppercase tracking-[0.22em] text-paper/40">
            {state.settings.branchName}
          </p>
        </div>

        <nav
          className="scrollbar-slim mt-4 flex-1 space-y-0.5 overflow-y-auto px-3"
          aria-label="Navegación principal"
        >
          {NAV.map((item) => {
            const Icon = Icons[item.icon];
            const active = pathname.startsWith(item.href);
            const locked = isEmployee && !item.employee;
            const badge = badgeFor(item);

            if (locked) return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-matcha-deep text-white shadow-pop"
                    : "text-paper/75 hover:bg-white/8 hover:text-paper",
                )}
              >
                <Icon
                  className={cx(
                    "shrink-0",
                    active
                      ? "text-matcha-light"
                      : "text-paper/50 group-hover:text-paper/80",
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {badge ? (
                  <span className="rounded-full bg-matcha-light px-2 py-0.5 text-[10px] font-extrabold text-ink">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-5 text-xs text-paper/50">
          <p className="truncate font-extrabold text-paper/90">
            {state.me.fullName}
          </p>
          <p className="mt-1">
            {state.role === "admin" ? "Administrador" : "Empleado"} ·{" "}
            {cashClosedToday ? "caja cerrada" : "turno abierto"}
          </p>
        </div>
      </aside>

      {/* ----------------------------- Contenido ------------------------------ */}
      <div className="flex min-h-dvh flex-col lg:col-start-2">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="display text-xl lg:hidden">
                Tomo<span className="text-matcha-deep">Matcha</span>
              </span>
              <span className="hidden text-sm font-semibold text-muted first-letter:uppercase lg:block">
                {longDate(state.loadedAt, tz)}
              </span>
              {busy ? (
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-matcha-deep">
                  <span
                    className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-matcha"
                    aria-hidden
                  />
                  Guardando
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Badge tone={state.role === "admin" ? "ink" : "neutral"}>
                {state.role === "admin" ? "Admin" : "Empleado"}
              </Badge>
              <UserButton
                appearance={{ elements: { avatarBox: "h-9 w-9" } }}
              />
            </div>
          </div>

          {cashClosedToday ? (
            <div className="flex flex-wrap items-center justify-center gap-2 bg-amber/15 px-4 py-1.5 text-center text-xs font-bold text-amber">
              La caja de hoy está cerrada: el cobro está pausado.
              {state.role === "admin" ? (
                <Link href="/corte" className="underline underline-offset-2">
                  Reabrir en Corte de caja
                </Link>
              ) : (
                <span className="font-normal">
                  Pídele a un administrador que reabra el turno.
                </span>
              )}
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
        <div className={cx("grid", isEmployee ? "grid-cols-2" : "grid-cols-4")}>
          {mobilePrimary
            .filter((item) => !isEmployee || item.employee)
            .map((item) => {
              const Icon = Icons[item.icon];
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "focus-ring flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold",
                    active ? "text-matcha-deep" : "text-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.short}
                </Link>
              );
            })}
          {!isEmployee ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="focus-ring flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold text-muted"
            >
              <Icons.menu className="h-5 w-5" />
              Más
            </button>
          ) : null}
        </div>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Todos los módulos"
      >
        <div className="grid grid-cols-2 gap-2">
          {NAV.filter((item) => !isEmployee || item.employee).map((item) => {
            const Icon = Icons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="focus-ring flex items-center gap-3 rounded-xl2 border border-line bg-white px-4 py-3.5 text-sm font-bold text-ink hover:border-matcha"
              >
                <Icon className="text-matcha-deep" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </Modal>

      <ToastViewport />
    </div>
  );
}
