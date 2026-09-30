/* ============================================================================
 * Piezas puras del asistente: validar la conversación, limitar la frecuencia y
 * convertir la respuesta del modelo en texto plano.
 *
 * Viven aparte de `lib/assistant.ts` a propósito. Aquello toca la llave del
 * proveedor y la base de datos, así que es `server-only` y no se puede probar
 * suelto; esto no guarda ningún secreto, y son justo las partes donde un error
 * silencioso sale caro: un límite mal hecho deja abierta la cuenta de pago, y
 * un parser flojo corta las respuestas a la mitad delante del cliente.
 * ========================================================================== */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Mensajes de la conversación que viajan al modelo (los más recientes). */
export const MAX_HISTORY_MESSAGES = 12;
/** Largo máximo de lo que escribe la persona. */
export const MAX_USER_CHARS = 2000;
/** Tope de toda la conversación enviada, para que el costo tenga techo. */
export const MAX_TOTAL_CHARS = 12_000;

export type ParsedConversation =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; error: string };

/**
 * Valida y recorta la conversación que manda el navegador. Nada de lo que llega
 * se toma por bueno: roles y largos se comprueban aquí, y el historial se
 * acota para que una conversación larga no encarezca cada pregunta.
 */
export function parseConversation(raw: unknown): ParsedConversation {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Escribe tu pregunta para empezar." };
  }

  let messages: ChatMessage[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      return { ok: false, error: "La conversación no es válida." };
    }
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, error: "La conversación no es válida." };
    }
    const text = content.trim();
    if (text) messages.push({ role, content: text });
  }

  messages = messages.slice(-MAX_HISTORY_MESSAGES);
  // El modelo espera que la conversación abra con la persona, no con una
  // respuesta suya que quedó recortada por el límite.
  while (messages.length && messages[0].role !== "user") messages.shift();

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, error: "Escribe tu pregunta para empezar." };
  }
  if (last.content.length > MAX_USER_CHARS) {
    return {
      ok: false,
      error: `Tu mensaje es muy largo (máximo ${MAX_USER_CHARS} caracteres). Hazlo más corto.`,
    };
  }

  // Lo viejo se recorta antes que lo reciente: la pregunta actual manda.
  messages = messages.map((m, i) =>
    i === messages.length - 1 ? m : { ...m, content: m.content.slice(0, MAX_USER_CHARS) },
  );
  let total = messages.reduce((n, m) => n + m.content.length, 0);
  while (total > MAX_TOTAL_CHARS && messages.length > 1) {
    total -= messages[0].content.length;
    messages.shift();
  }
  while (messages.length && messages[0].role !== "user") messages.shift();

  return { ok: true, messages };
}

/* ------------------------------ Límite de uso ------------------------------- */

export interface RateLimiter {
  /** Cuenta una pregunta; dice si cabe y, si no, cuántos segundos esperar. */
  take(key: string, now?: number): { ok: true } | { ok: false; retryAfterSec: number };
}

/**
 * Ventana deslizante en memoria, por persona.
 *
 * Honestidad sobre lo que es: en un hosting sin servidor cada instancia lleva
 * su propia cuenta, así que esto frena el uso desbocado de una sesión (un
 * ciclo, un dedo pegado a la tecla), no es un tope duro de gasto. El tope duro
 * es el límite de crédito de la llave en el panel del proveedor.
 */
export function createRateLimiter({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    take(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

      if (recent.length >= max) {
        hits.set(key, recent);
        const retryAfterSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
        return { ok: false, retryAfterSec };
      }

      recent.push(now);
      hits.set(key, recent);

      // El mapa no debe crecer sin fin con gente que ya no vuelve.
      if (hits.size > 500) {
        for (const [k, times] of hits) {
          if (times.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
      return { ok: true };
    },
  };
}

/* --------------------------- Respuesta del modelo --------------------------- */

/** El proveedor cortó la respuesta a media frase (el navegador lo ve como error). */
export class StreamInterruptedError extends Error {
  constructor(message = "La respuesta se interrumpió.") {
    super(message);
    this.name = "StreamInterruptedError";
  }
}

/**
 * Convierte el stream de eventos del proveedor (SSE con JSON) en texto plano,
 * que es lo único que el navegador necesita: trozos de la respuesta, sin
 * protocolo. Se descarta el razonamiento interno; sólo pasa lo que el modelo
 * dice a la persona.
 *
 * Un evento puede llegar partido entre dos lecturas de red, por eso se acumula
 * y sólo se procesan líneas completas.
 */
export function sseToText(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let finished = false;

  const handleLine = (
    line: string,
    controller: TransformStreamDefaultController<Uint8Array>,
  ) => {
    const trimmed = line.trim();
    // Líneas vacías y comentarios de keep-alive («: OPENROUTER PROCESSING»).
    if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) return;

    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") {
      finished = true;
      return;
    }

    let event: {
      error?: unknown;
      choices?: { delta?: { content?: unknown }; finish_reason?: unknown }[];
    };
    try {
      event = JSON.parse(payload);
    } catch {
      return; // Un evento ilegible no debe tirar una respuesta que va bien.
    }

    if (event.error) {
      throw new StreamInterruptedError();
    }
    const choice = event.choices?.[0];
    if (choice?.finish_reason === "error") {
      throw new StreamInterruptedError();
    }
    const piece = choice?.delta?.content;
    if (typeof piece === "string" && piece) {
      controller.enqueue(encoder.encode(piece));
    }
  };

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (finished) return;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (finished) break;
          handleLine(line, controller);
        }
      },
      flush(controller) {
        buffer += decoder.decode();
        if (!finished && buffer) handleLine(buffer, controller);
      },
    }),
  );
}
