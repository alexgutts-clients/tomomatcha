"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Role } from "@/lib/types";
import { Button, cx } from "@/components/ui";

/* ============================================================================
 * Chat de ayuda flotante.
 *
 * Vive en el layout, así que sigue montado mientras se cambia de módulo: la
 * conversación no se pierde al pasar de Comandas a Inventario. Se pierde al
 * recargar la página, a propósito — no se guarda en ningún lado, ni en el
 * navegador ni en el servidor: son preguntas de uso, no historial de negocio.
 *
 * El botón flotante tiene que convivir con dos cosas que también viven abajo:
 * la barra de navegación del celular y, en el punto de venta, la barra del
 * ticket con el total. Tapar cualquiera de las dos en plena venta cuesta más
 * que lo que el asistente ayuda, así que en celular se coloca por encima de
 * ellas, y en pantalla grande es un círculo chico que no llega al texto del
 * botón «Cobrar».
 *
 * La respuesta llega por partes (texto plano) y se pinta conforme entra. Lo que
 * el modelo escribe se muestra siempre como texto de React —nunca como HTML—,
 * así que aunque devuelva algo raro no puede inyectar nada en la pantalla.
 * ========================================================================== */

interface UiMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const MAX_CHARS = 2000;
const HINT_KEY = "tomomatcha:asistente-visto";

/* ------------------------------ Sugerencias -------------------------------- */

const FORGOT_DAY = "Se me olvidó capturar un día, ¿cómo lo registro?";

/** Preguntas de arranque según la pantalla y el perfil. */
function suggestionsFor(pathname: string, role: Role): string[] {
  const admin = role === "admin";
  const at = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

  if (at("/pos")) {
    return [
      "¿Cómo cobro un pedido paso a paso?",
      "¿Qué cambia entre «Para aquí» y «Para llevar»?",
      "¿Cómo pongo propina o una promoción?",
      "¿Por qué no me deja cobrar?",
    ];
  }
  if (at("/comandas")) {
    return [
      "¿Cómo avanzo un pedido en el tablero?",
      "¿Qué significan los minutos de espera y los colores?",
      admin ? "¿Cómo cancelo un ticket?" : "Cobré mal un ticket, ¿qué hago?",
    ];
  }
  if (at("/inventario")) {
    return [
      "¿Qué diferencia hay entre «Recibir pedido» y «Contar»?",
      "¿Cómo registro una merma?",
      "¿Por qué un insumo sale como «resurtir»?",
    ];
  }
  if (at("/productos")) {
    return admin
      ? [
          "¿Cómo pauso un producto que se acabó?",
          "¿Cómo cambio un precio?",
          "¿Cómo creo una categoría nueva?",
        ]
      : [
          "¿Cómo quito del menú un producto que se acabó?",
          "¿Qué puedo cambiar en Productos con mi perfil?",
        ];
  }
  if (at("/reportes")) {
    return [
      "¿Cómo veo las ventas de un mes completo?",
      "¿Cómo descargo las ventas en Excel?",
      FORGOT_DAY,
    ];
  }
  if (at("/corte")) {
    return [
      "¿Cómo hago el corte de caja?",
      "Hice el corte por error, ¿qué hago?",
      FORGOT_DAY,
    ];
  }
  if (at("/pedidos")) {
    return [
      "¿Qué diferencia hay entre cancelar y borrar un ticket?",
      "¿Cómo quito un producto de un ticket?",
    ];
  }
  if (at("/ajustes")) {
    return [
      "¿Cómo activo a un empleado nuevo?",
      "¿Qué pasa si apago el módulo de inventario?",
    ];
  }
  if (at("/preparados")) {
    return [
      "¿Cómo registro un lote con caducidad?",
      "¿Por qué el aviso rojo no se quita solo?",
    ];
  }
  return [
    "¿Cómo empiezo mi turno?",
    "¿Por qué no me deja cobrar?",
    role === "admin"
      ? "¿Qué puedo hacer como administrador?"
      : "¿Qué puedo hacer con mi perfil de empleado?",
  ];
}

/* ------------------------- Texto con formato mínimo ------------------------ */

type Block =
  | { kind: "p"; text: string }
  | { kind: "ol"; start: number; items: string[] }
  | { kind: "ul"; items: string[] };

/**
 * El modelo escribe listas y negritas en estilo Markdown. No hace falta un
 * intérprete completo (y sería una dependencia más): sólo párrafos, listas y
 * **negritas**, que es lo único que se le pide y lo único que se dibuja.
 *
 * Un renglón en blanco entre elementos de una misma lista no la parte: los
 * modelos los ponen seguido y una lista numerada volvería a empezar en 1.
 */
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let gap = false;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      gap = true;
      continue;
    }

    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line);
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];

    if (numbered) {
      if (last?.kind === "ol") last.items.push(numbered[2]);
      else blocks.push({ kind: "ol", start: Number(numbered[1]), items: [numbered[2]] });
    } else if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
    } else if (heading) {
      blocks.push({ kind: "p", text: `**${heading[1].replace(/\*\*/g, "")}**` });
    } else if (
      last &&
      !gap &&
      (last.kind === "ol" || last.kind === "ul") &&
      raw.startsWith(" ")
    ) {
      // Continuación sangrada de un elemento de la lista.
      last.items[last.items.length - 1] += ` ${line}`;
    } else if (last?.kind === "p" && !gap) {
      last.text += `\n${line}`;
    } else {
      blocks.push({ kind: "p", text: line });
    }
    gap = false;
  }
  return blocks;
}

/** **negritas** y `código` dentro de una línea; todo lo demás, texto tal cual. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-extrabold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-cream px-1 py-0.5 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-6 text-ink">
      {parseBlocks(text).map((block, i) => {
        if (block.kind === "ol") {
          return (
            <ol key={i} start={block.start} className="list-decimal space-y-1 pl-5 marker:font-extrabold marker:text-matcha-deep">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-matcha">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {inline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

/* --------------------------------- Iconos ---------------------------------- */

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.55L3 20.5l1.5-5.1A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9.2 9.6a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.2-2.8 3.7" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

/* --------------------------------- Módulo ---------------------------------- */

export function Assistant({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "waiting" | "streaming">("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const idRef = useRef(0);
  const stickRef = useRef(true);
  const wasOpen = useRef(false);

  const busy = phase !== "idle";
  const onPos = pathname === "/pos" || pathname.startsWith("/pos/");

  /* Aviso de estreno: una sola vez por navegador, si el almacenamiento deja. */
  useEffect(() => {
    let timer: number | undefined;
    try {
      if (!window.localStorage.getItem(HINT_KEY)) {
        window.localStorage.setItem(HINT_KEY, "1");
        setHint(true);
        timer = window.setTimeout(() => setHint(false), 12_000);
      }
    } catch {
      // Sin almacenamiento (ventana privada): simplemente no hay aviso.
    }
    return () => window.clearTimeout(timer);
  }, []);

  /* Foco: al abrir va a la caja de texto; al cerrar regresa al botón. */
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      fabRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Sigue la respuesta hacia abajo, salvo que la persona haya subido a leer. */
  useEffect(() => {
    const el = logRef.current;
    if (open && el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, phase, error, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const onScroll = () => {
    const el = logRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const openPanel = () => {
    setHint(false);
    setOpen(true);
  };

  /** Pide la respuesta a `history` (que termina en un mensaje de la persona). */
  const run = async (history: UiMessage[]) => {
    const assistantId = ++idRef.current;
    stickRef.current = true;
    setError(null);
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setPhase("waiting");

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";

    const dropPlaceholder = () =>
      setMessages((list) =>
        list.filter((m) => !(m.id === assistantId && m.content === "")),
      );

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role: r, content }) => ({ role: r, content })),
          path: pathname,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "El asistente no pudo responder. Vuelve a intentar.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setPhase("streaming");

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const snapshot = answer;
        setMessages((list) =>
          list.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)),
        );
      }
      answer += decoder.decode();

      if (!answer.trim()) {
        dropPlaceholder();
        setError("No pude armar una respuesta. Intenta decirlo de otra forma.");
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // La persona detuvo la respuesta o empezó otra conversación.
        if (!answer.trim()) dropPlaceholder();
      } else if (answer.trim()) {
        setError("La respuesta se interrumpió. Puedes volver a preguntar.");
      } else {
        dropPlaceholder();
        setError(
          err instanceof TypeError
            ? "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."
            : err instanceof Error
              ? err.message
              : "El asistente no pudo responder. Vuelve a intentar.",
        );
      }
    } finally {
      // Sólo la respuesta más reciente apaga el indicador: una anterior que se
      // canceló tarde no debe declarar «libre» a la que ya va en camino.
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase("idle");
      }
    }
  };

  const send = (raw: string) => {
    const content = raw.trim().slice(0, MAX_CHARS);
    if (!content || busy) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    void run([...messages, { id: ++idRef.current, role: "user", content }]);
  };

  const retry = () => {
    if (busy) return;
    const lastUser = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUser < 0) return;
    void run(messages.slice(0, lastUser + 1));
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setPhase("idle");
    setInput("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  const suggestions = suggestionsFor(pathname, role);
  const last = messages[messages.length - 1];
  const waiting = phase === "waiting" || (phase === "streaming" && last?.content === "");

  return (
    <>
      {/* ---------------------------- Botón flotante ---------------------------- */}
      {!open ? (
        <div
          className={cx(
            "fixed right-4 z-40 flex items-center gap-2 lg:bottom-6 lg:right-6",
            onPos
              ? "bottom-[calc(8.75rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]",
          )}
        >
          {hint ? (
            <button
              type="button"
              onClick={openPanel}
              className="animate-rise focus-ring rounded-full border border-line bg-white px-3.5 py-2 text-xs font-extrabold text-ink shadow-card"
            >
              ¿Dudas? Pregúntame
            </button>
          ) : null}
          <button
            ref={fabRef}
            type="button"
            onClick={openPanel}
            aria-label="Abrir el asistente de ayuda"
            aria-haspopup="dialog"
            title="Ayuda"
            className="focus-ring grid h-12 w-12 shrink-0 place-items-center rounded-full bg-matcha-deep text-paper shadow-pop transition hover:bg-matcha active:scale-95 lg:h-14 lg:w-14"
          >
            <ChatIcon />
          </button>
        </div>
      ) : null}

      {/* -------------------------------- Panel -------------------------------- */}
      {open ? (
        <div
          role="dialog"
          aria-label="Asistente de TomoMatcha"
          className={cx(
            "animate-rise fixed z-[55] flex flex-col overflow-hidden border border-line bg-paper shadow-lift",
            "inset-x-2 bottom-2 top-[4.5rem] rounded-xl3",
            "sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[400px]",
            "lg:bottom-6 lg:right-6",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line bg-matcha-mist px-4 py-3">
            <div className="min-w-0">
              <p className="display text-lg leading-tight text-ink">
                Asistente TomoMatcha
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted">
                Te explica cómo usar el sistema. Es una IA.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {messages.length ? (
                <button
                  type="button"
                  onClick={reset}
                  className="focus-ring rounded-full px-3 py-1.5 text-xs font-extrabold text-muted transition hover:bg-white hover:text-ink"
                >
                  Nueva
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar el asistente"
                className="focus-ring rounded-full p-2 text-muted transition hover:bg-white hover:text-ink"
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
          </div>

          <div
            ref={logRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
            aria-busy={busy}
            className="scrollbar-slim flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {!messages.length ? (
              <div className="space-y-4">
                <div className="rounded-xl2 border border-line bg-white px-4 py-3">
                  <RichText
                    text={
                      "Hola, soy el asistente de TomoMatcha. Pregúntame cómo se hace algo en el sistema: cobrar, cancelar un ticket, contar el inventario, el corte de caja…\n\nNo veo tus ventas ni tu inventario, sólo te explico cómo funciona."
                    }
                  />
                </div>
                <div>
                  <p className="eyebrow">Prueba con</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="focus-ring max-w-full break-words rounded-full border border-line bg-white px-3.5 py-2 text-left text-xs font-bold text-ink transition hover:border-matcha hover:text-matcha-deep"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm leading-6 text-paper">
                    {m.content}
                  </p>
                </div>
              ) : m.content ? (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[92%] break-words rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3">
                    <RichText text={m.content} />
                  </div>
                </div>
              ) : null,
            )}

            {waiting ? (
              <div className="flex justify-start" aria-label="El asistente está escribiendo">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-matcha"
                      style={{ animationDelay: `${i * 0.25}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-xl2 border border-amber/40 bg-amber/5 px-4 py-3 text-sm leading-6 text-ink"
              >
                <p>{error}</p>
                {messages.some((m) => m.role === "user") ? (
                  <button
                    type="button"
                    onClick={retry}
                    disabled={busy}
                    className="focus-ring mt-1.5 rounded-full text-xs font-extrabold text-matcha-deep underline underline-offset-2 disabled:opacity-40"
                  >
                    Intentar de nuevo
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-line bg-paper px-3 pb-3 pt-2.5"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                maxLength={MAX_CHARS}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
                }}
                onKeyDown={onKeyDown}
                placeholder="Escribe tu pregunta…"
                aria-label="Tu pregunta"
                className="focus-ring max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-xl2 border border-line bg-white px-4 py-2.5 text-sm leading-6 text-ink placeholder:text-muted/70"
              />
              {busy ? (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => abortRef.current?.abort()}
                  className="h-11 shrink-0"
                >
                  Detener
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="matcha"
                  size="md"
                  disabled={!input.trim()}
                  className="h-11 shrink-0"
                >
                  Enviar
                </Button>
              )}
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
