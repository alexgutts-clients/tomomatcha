import { NextResponse } from "next/server";
import { describeError } from "@/lib/action-utils";
import { askAssistant } from "@/lib/assistant";
import { createRateLimiter, parseConversation } from "@/lib/assistant-stream";
import { requireStaff } from "@/lib/auth";
import { assistantStatus } from "@/lib/env";

/* ============================================================================
 * Chat de ayuda.
 *
 * No es una server action porque la respuesta se entrega por partes conforme el
 * modelo la escribe: una server action espera a tenerla completa, y un modelo
 * con razonamiento puede tardar varios segundos en soltar la primera palabra.
 * Sigue las mismas reglas que las acciones: primero autoriza, después valida,
 * después trabaja, y ninguna excepción llega al navegador — todo error sale en
 * español y sin nombrar al proveedor.
 *
 * Sólo responde a cuentas activas del equipo. No basta con tener sesión: la
 * instancia de inicio de sesión puede ser compartida con otros proyectos, y
 * cada pregunta se paga.
 * ========================================================================== */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Lo que pesa, como máximo, el cuerpo de una petición (con margen de sobra). */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * 30 preguntas cada 10 minutos por persona: bastante más de lo que alguien
 * escribe a mano en barra, y suficiente para cortar un ciclo desbocado.
 */
const limiter = createRateLimiter({ windowMs: 10 * 60_000, max: 30 });

function fail(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(request: Request) {
  const status = assistantStatus();
  if (!status.ok) {
    console.error("[asistente] Faltan variables:", status.missing.join(", "));
    return fail(503, "El asistente todavía no está conectado.");
  }

  let staff;
  try {
    staff = await requireStaff();
  } catch (error) {
    const described = describeError(error);
    return fail(described.kind === "pendiente" ? 403 : 401, described.message);
  }

  const wait = limiter.take(staff.id);
  if (!wait.ok) {
    return fail(
      429,
      "Has hecho muchas preguntas seguidas. Espera un momento y vuelve a intentar.",
      { "Retry-After": String(wait.retryAfterSec) },
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return fail(415, "La petición no es válida.");
  }

  let payload: { messages?: unknown; path?: unknown };
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return fail(413, "La conversación es demasiado larga. Empieza una nueva.");
    }
    payload = JSON.parse(text);
  } catch {
    return fail(400, "La petición no es válida.");
  }

  const conversation = parseConversation(payload?.messages);
  if (!conversation.ok) return fail(400, conversation.error);

  const answer = await askAssistant({
    messages: conversation.messages,
    role: staff.role,
    pathname: payload.path,
    staffId: staff.id,
    signal: request.signal,
  });
  if (!answer.ok) return fail(answer.status, answer.error);

  return new Response(answer.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Sin caché y sin que ningún intermediario reagrupe los trozos: la
      // gracia es verla escribirse.
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
