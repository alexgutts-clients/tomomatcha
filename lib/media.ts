/* ============================================================================
 * URL pública de un archivo guardado en R2.
 *
 * Con dominio público configurado (`R2_PUBLIC_BASE_URL`) se sirve directo desde
 * Cloudflare, que es lo ideal: cacheado y sin pasar por la aplicación. Sin él,
 * se sirve por `/api/media/...`, que firma la descarga contra R2 y sólo
 * responde a usuarios con sesión.
 *
 * Este módulo lo usan servidor y cliente, así que no importa nada de `server-only`.
 * ========================================================================== */

export function mediaUrl(
  key: string | null | undefined,
  publicBase: string | null,
): string | null {
  if (!key) return null;
  if (publicBase) return `${publicBase.replace(/\/+$/, "")}/${key}`;
  return `/api/media/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}
