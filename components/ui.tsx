"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "@/lib/store";
import { mediaUrl } from "@/lib/media";

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
        {desc ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{desc}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
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
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
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

/* -------------------------------- Formularios -------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error ? (
        <span className="mt-1 block text-xs font-bold text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs leading-5 text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "focus-ring w-full rounded-xl2 border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink placeholder:font-normal placeholder:text-muted/70 disabled:opacity-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputBase, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea {...props} className={cx(inputBase, "leading-6", props.className)} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputBase, "pr-9", props.className)} />;
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
      {desc ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{desc}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------ Acceso restringido / módulos ------------------------ */

export function AccessGate({ module }: { module: string }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="text-4xl" aria-hidden>
        🔒
      </span>
      <p className="eyebrow mt-5">Acceso restringido</p>
      <h1 className="display mt-2 text-3xl text-ink">
        {module} es solo para administración
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
        Tu cuenta tiene perfil de <strong>empleado</strong>, con acceso a Punto
        de venta y Comandas. Si necesitas entrar aquí, pídele a un administrador
        que te cambie el rol en Ajustes.
      </p>
      <Link
        href="/pos"
        className="focus-ring mt-6 inline-flex items-center rounded-full bg-matcha-deep px-5 py-2.5 text-sm font-bold text-paper shadow-pop hover:bg-matcha"
      >
        Ir al punto de venta
      </Link>
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
      <p className="eyebrow mt-5">Módulo apagado</p>
      <h1 className="display mt-2 text-3xl text-ink">{module} está desactivado</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
        {detail ??
          "Un administrador apagó este módulo desde Ajustes. Vuelve a encenderlo cuando lo necesites."}
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
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="focus-ring -mr-1 -mt-1 rounded-full p-2 text-muted hover:bg-cream hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Confirmación para acciones que no se pueden deshacer. */
export function ConfirmButton({
  label,
  confirmLabel,
  question,
  onConfirm,
  variant = "danger",
  size = "sm",
  disabled,
}: {
  label: string;
  confirmLabel?: string;
  question?: string;
  onConfirm: () => void;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 6000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {question ? (
        <span className="text-xs font-bold text-danger">{question}</span>
      ) : null}
      <Button
        variant="danger"
        size={size}
        disabled={disabled}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel ?? "Sí, confirmar"}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setArmed(false)}>
        Cancelar
      </Button>
    </span>
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
              : "border-amber/50 bg-paper text-ink",
          )}
        >
          <p className="text-sm font-extrabold">{t.title}</p>
          {t.detail ? (
            <p
              className={cx(
                "mt-0.5 text-xs leading-5",
                t.tone === "ok" ? "text-paper/70" : "text-muted",
              )}
            >
              {t.detail}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------- QR -------------------------------------- */

/**
 * Código QR real y escaneable. Se genera en el servidor (`/api/qr`) para que
 * imprima nítido y no dependa de JavaScript del navegador. Si la petición
 * falla, se muestra un aviso en lugar de una imagen rota.
 */
export function QrCode({
  value,
  className,
  alt,
}: {
  value: string;
  className?: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cx(
          "grid place-items-center rounded-xl2 border border-dashed border-line p-3 text-center text-[10px] leading-4 text-muted",
          className,
        )}
      >
        No se pudo generar el código. Vuelve a cargar la página.
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/qr?value=${encodeURIComponent(value)}`}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/* ------------------------------ Imagen de media ------------------------------- */

export function MediaImage({
  objectKey,
  alt,
  className,
  fallback,
}: {
  objectKey: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const { state } = useStore();
  const [broken, setBroken] = useState(false);
  const url = mediaUrl(objectKey, state.media.publicBase);

  if (!url || broken) return <>{fallback ?? null}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

/** Selector de archivo que sube a R2 y avisa del resultado. */
export function ImageUpload({
  target,
  label = "Subir imagen",
  accept = "image/*",
  compact,
}: {
  target: { purpose: "producto"; productId: string } | { purpose: "logo" };
  label?: string;
  accept?: string;
  compact?: boolean;
}) {
  const { state, uploadMedia, notify } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const inputId = useId();

  if (!state.media.configured) {
    return (
      <p className="text-xs leading-5 text-muted">
        Para subir imágenes falta configurar Cloudflare R2 (ver{" "}
        <code className="rounded bg-cream px-1 py-0.5 text-[11px]">
          INSTRUCCIONES.md
        </code>
        ).
      </p>
    );
  }

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      notify("Archivo demasiado grande", "El límite es 25 MB.", "warn");
      return;
    }
    setUploading(true);
    await uploadMedia(file, target);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <Button
        variant="ghost"
        size={compact ? "sm" : "md"}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Subiendo…" : label}
      </Button>
    </span>
  );
}
