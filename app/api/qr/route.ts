import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { loadStaff } from "@/lib/auth";

/* ============================================================================
 * Códigos QR reales (escaneables) en SVG.
 *
 * Se generan en el servidor para que no dependan de JavaScript en el cliente y
 * para que impriman nítidos a cualquier tamaño. El contenido llega como texto
 * en `?value=`; aquí sólo se codifica, no se navega a él.
 * ========================================================================== */

export const dynamic = "force-dynamic";

const MAX_LENGTH = 512;

export async function GET(request: Request) {
  let staff;
  try {
    staff = await loadStaff();
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!staff?.active) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const value = new URL(request.url).searchParams.get("value")?.trim() ?? "";
  if (!value || value.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: "Falta el contenido del código." },
      { status: 400 },
    );
  }

  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#191a14", light: "#00000000" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
