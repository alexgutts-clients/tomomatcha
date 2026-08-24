import Link from "next/link";

/* ============================================================================
 * Pantallas de estado del sistema (sin sesión, sin permisos, sin configurar).
 *
 * Son componentes de servidor a propósito: aparecen antes de que exista estado
 * de aplicación, así que no pueden depender del store.
 * ========================================================================== */

function Frame({
  emoji,
  eyebrow,
  title,
  children,
}: {
  emoji: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-16">
      <div className="w-full max-w-xl">
        <p className="display text-center text-2xl text-ink">
          Tomo<span className="text-matcha-deep">Matcha</span>
        </p>
        <div className="card mt-6 p-7">
          <span className="text-4xl" aria-hidden>
            {emoji}
          </span>
          <p className="eyebrow mt-4">{eyebrow}</p>
          <h1 className="display mt-1.5 text-2xl text-ink">{title}</h1>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

/** Falta configuración de infraestructura: se dice exactamente qué. */
export function ConfigNotice({
  services,
}: {
  services: { name: string; missing: string[]; hint: string }[];
}) {
  return (
    <Frame
      emoji="🔌"
      eyebrow="Configuración incompleta"
      title="Falta conectar un servicio"
    >
      <p>
        La aplicación está lista, pero necesita las llaves de acceso a los
        servicios que usa. Estas son las variables de entorno que faltan:
      </p>
      <ul className="space-y-3">
        {services.map((service) => (
          <li
            key={service.name}
            className="rounded-xl2 border border-line bg-white p-4"
          >
            <p className="text-sm font-extrabold text-ink">{service.name}</p>
            <ul className="mt-2 space-y-1">
              {service.missing.map((name) => (
                <li key={name}>
                  <code className="rounded bg-cream px-1.5 py-0.5 text-xs font-bold text-ink">
                    {name}
                  </code>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-5">{service.hint}</p>
          </li>
        ))}
      </ul>
      <p className="border-t border-line pt-3 text-xs">
        El archivo <strong>INSTRUCCIONES.md</strong> del repositorio tiene el
        paso a paso para obtener cada valor.
      </p>
    </Frame>
  );
}

/** La cuenta existe en Clerk pero un administrador no la ha autorizado. */
export function PendingNotice({
  email,
  name,
}: {
  email: string | null;
  name: string;
}) {
  return (
    <Frame
      emoji="🪪"
      eyebrow="Cuenta en espera"
      title="Un administrador debe autorizarte"
    >
      <p>
        Tu cuenta quedó registrada como <strong>{name}</strong>
        {email ? (
          <>
            {" "}
            (<span className="font-bold">{email}</span>)
          </>
        ) : null}
        , pero todavía no tiene acceso a la operación.
      </p>
      <p>
        Pídele a un administrador de TomoMatcha que te active desde{" "}
        <strong>Ajustes → Equipo</strong>. En cuanto lo haga, vuelve a cargar
        esta página.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/inicio"
          className="focus-ring inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper hover:bg-ink-soft"
        >
          Volver a intentar
        </Link>
        <Link
          href="/sign-in?redirect_url=/inicio"
          className="focus-ring inline-flex items-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink hover:border-matcha"
        >
          Entrar con otra cuenta
        </Link>
      </div>
    </Frame>
  );
}

/** Algo falló al leer la base: se muestra el motivo sin tirar la aplicación. */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <Frame
      emoji="⚠️"
      eyebrow="No se pudo cargar la operación"
      title="Hubo un problema con la base de datos"
    >
      <p className="rounded-xl2 border border-danger/25 bg-danger/5 p-4 text-xs leading-5 text-ink">
        {message}
      </p>
      <p>
        Revisa que las migraciones de <code>supabase/migrations/</code> estén
        aplicadas en el proyecto y que las llaves correspondan a ese proyecto.
      </p>
      <Link
        href="/inicio"
        className="focus-ring inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper hover:bg-ink-soft"
      >
        Volver a intentar
      </Link>
    </Frame>
  );
}
