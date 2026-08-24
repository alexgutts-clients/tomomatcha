import { NextResponse } from "next/server";
import { loadStaff } from "@/lib/auth";
import { isR2Configured, isSafeObjectKey, presignDownload } from "@/lib/r2";

/* ============================================================================
 * Entrega de archivos de R2 cuando no hay dominio público configurado.
 *
 * Se firma una URL de descarga de corta vida y se redirige a ella: el archivo
 * viaja directo de Cloudflare al navegador, sin pasar por este servidor. Sólo
 * responde a usuarios con sesión activa.
 *
 * Con `R2_PUBLIC_BASE_URL` configurado, la aplicación ni pasa por aquí: las
 * imágenes se piden directo al dominio de Cloudflare, que las cachea.
 * ========================================================================== */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Cloudflare R2 no está configurado." },
      { status: 503 },
    );
  }

  let staff;
  try {
    staff = await loadStaff();
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!staff?.active) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { key: segments } = await context.params;
  const key = (segments ?? []).map((part) => decodeURIComponent(part)).join("/");

  if (!isSafeObjectKey(key)) {
    return NextResponse.json({ error: "Archivo no válido." }, { status: 400 });
  }

  try {
    const url = await presignDownload(key, 900);
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo." },
      { status: 502 },
    );
  }
}
