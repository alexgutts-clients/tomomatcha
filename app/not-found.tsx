import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-16">
      <div className="max-w-md text-center">
        <p className="display text-2xl text-ink">
          Tomo<span className="text-matcha-deep">Matcha</span>
        </p>
        <p className="mt-8 text-5xl" aria-hidden>
          🍵
        </p>
        <h1 className="display mt-4 text-2xl text-ink">
          Esta página no existe
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          El enlace puede estar mal escrito o el recurso ya no está disponible.
        </p>
        <Link
          href="/inicio"
          className="focus-ring mt-6 inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper hover:bg-ink-soft"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
