"use client";

import Link from "next/link";
import { ReactNode, useEffect } from "react";
import { useStore } from "@/lib/store";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- Página ----------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-1 text-3xl text-ink md:text-4xl">{title}</h1>
        {desc ? <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{desc}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* -------------------------------- Botones ------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "matcha" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "px-3.5 py-1.5 text-xs",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-6 py-3.5 text-base",
        variant === "primary" && "bg-ink text-paper hover:bg-ink-soft",
        variant === "matcha" && "bg-matcha-deep text-paper shadow-pop hover:bg-matcha",
        variant === "ghost" &&
          "border border-line bg-white text-ink hover:border-matcha hover:text-matcha-deep",
        variant === "danger" && "bg-danger/10 text-danger hover:bg-danger/20",
        className,
      )}
    />
  );
}

/* --------------------------------- Badges ------------------------------------ */

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "matcha" | "amber" | "danger" | "ink";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]",
        tone === "neutral" && "bg-cream text-muted",
        tone === "matcha" && "bg-matcha-light text-matcha-deep",
        tone === "amber" && "bg-amber/15 text-amber",
        tone === "danger" && "bg-danger/10 text-danger",
        tone === "ink" && "bg-ink text-paper",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DemoTag({ label = "Demo" }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-matcha/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-matcha-deep">
      <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-matcha" aria-hidden />
      {label}
    </span>
  );
}

/* --------------------------------- Tarjetas ---------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("card p-5", className)}>{children}</div>;
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "matcha" | "amber";
}) {
  return (
    <div
      className={cx(
        "card p-4",
        tone === "matcha" && "border-matcha/30 bg-matcha-mist",
        tone === "amber" && "border-amber/30 bg-amber/5",
      )}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="display mt-1.5 text-2xl text-ink md:text-[1.7rem]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/* --------------------------------- Switch ------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "focus-ring relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-matcha-deep" : "bg-ink/15",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

/* ------------------------------ Estados vacíos -------------------------------- */

export function EmptyState({
  emoji,
  title,
  desc,
  action,
}: {
  emoji: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <p className="display mt-4 text-xl text-ink">{title}</p>
      {desc ? <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{desc}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------ Acceso restringido / flags -------------------------- */

export function AccessGate({ module }: { module: string }) {
  const { setRole } = useStore();
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="text-4xl" aria-hidden>
        🔒
      </span>
      <p className="eyebrow mt-5">Acceso restringido · demo</p>
      <h1 className="display mt-2 text-3xl text-ink">
        {module} es solo para administración
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
        El perfil <strong>Empleado</strong> puede operar Punto de venta y Comandas.
        En la demo puedes cambiar de perfil aquí mismo para explorar todo.
      </p>
      <Button variant="matcha" className="mt-6" onClick={() => setRole("admin")}>
        Cambiar a Administrador
      </Button>
    </div>
  );
}

export function FlagGate({
  module,
  detail,
}: {
  module: string;
  detail?: string;
}) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="text-4xl" aria-hidden>
        🌙
      </span>
      <p className="eyebrow mt-5">Módulo apagado por configuración</p>
      <h1 className="display mt-2 text-3xl text-ink">{module} está desactivado</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
        {detail ??
          "Un administrador apagó este módulo desde Ajustes. Todo es local y de demostración; vuelve a encenderlo cuando quieras."}
      </p>
      <Link
        href="/ajustes"
        className="focus-ring mt-6 inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper hover:bg-ink-soft"
      >
        Ir a Ajustes
      </Link>
    </div>
  );
}

/* ---------------------------------- Modal ------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cx(
          "animate-rise max-h-[92dvh] w-full overflow-y-auto rounded-t-xl3 bg-paper p-6 shadow-lift sm:rounded-xl3",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="display text-2xl text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="focus-ring -mr-1 -mt-1 rounded-full p-2 text-muted hover:bg-cream hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------- Toasts ----------------------------------- */

export function ToastViewport() {
  const { toasts } = useStore();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "animate-toastIn pointer-events-auto w-full rounded-xl2 border px-4 py-3 shadow-lift",
            t.tone === "ok"
              ? "border-matcha/40 bg-ink text-paper"
              : "border-amber/40 bg-amber/10 text-ink backdrop-blur",
          )}
        >
          <p className="text-sm font-extrabold">{t.title}</p>
          {t.detail ? (
            <p className={cx("mt-0.5 text-xs", t.tone === "ok" ? "text-paper/70" : "text-muted")}>
              {t.detail}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Fake QR ------------------------------------- */

/** QR decorativo de demostración (no escaneable), determinista por semilla. */
export function FakeQr({ seed, className }: { seed: string; className?: string }) {
  const n = 17;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    cells.push(((h >>> 0) & 3) === 0 ? false : ((h >>> 2) & 1) === 1);
  }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={5} height={5} className="qr-cell" />
      <rect x={x + 1} y={y + 1} width={3} height={3} fill="white" />
      <rect x={x + 2} y={y + 2} width={1} height={1} className="qr-cell" />
    </g>
  );
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      className={className}
      role="img"
      aria-label="Código QR de demostración (no escaneable)"
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="white" />
      {cells.map((on, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        const inFinder =
          (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
        return on && !inFinder ? (
          <rect key={i} x={x} y={y} width={1} height={1} className="qr-cell" />
        ) : null;
      })}
      {finder(1, 1)}
      {finder(n - 6, 1)}
      {finder(1, n - 6)}
    </svg>
  );
}
