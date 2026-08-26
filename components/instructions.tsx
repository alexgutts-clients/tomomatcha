"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";

/* ============================================================================
 * Manual de operación dentro de la propia aplicación.
 *
 * Un empleado nuevo entra por primera vez en plena barra, con clientes
 * esperando: no va a leer un PDF ni a buscar un manual en otro lado. Por eso
 * las instrucciones viven arriba de la pantalla principal, las ve cualquier
 * perfil (también el empleado, que en Inicio sólo vería el candado) y arrancan
 * cerradas para no estorbar a quien ya sabe usar el sistema.
 *
 * Está escrito corto a propósito: lo que se lee de pie, entre dos pedidos, no
 * puede ser un tratado. Cada sección cabe en una pantalla.
 * ========================================================================== */

interface Section {
  id: string;
  emoji: string;
  title: string;
  /** Quién usa ese módulo en el día a día. */
  audience: "todos" | "admin";
  intro: string;
  /** Lo que se hace, en orden. */
  pasos?: string[];
  /** Lo que conviene saber, sin orden. */
  puntos?: string[];
}

const SECTIONS: Section[] = [
  {
    id: "empezar",
    emoji: "🍵",
    title: "Qué es esto y cómo empezar",
    audience: "todos",
    intro:
      "Con esta aplicación se cobra, se preparan los pedidos, se controla el inventario y se cierra la caja. Todo lo que registres es real: se guarda al instante y lo ven las demás pantallas.",
    pasos: [
      "Inicia sesión con tu correo.",
      "Si es tu primer día, espera a que un administrador active tu cuenta.",
      "Abre Punto de venta y cobra.",
      "Pasa a Comandas y saca el pedido.",
      "Al terminar el turno, un administrador hace el corte de caja.",
    ],
  },
  {
    id: "acceso",
    emoji: "🔐",
    title: "Entrar y permisos",
    audience: "todos",
    intro:
      "Tu cuenta se crea sola al iniciar sesión, pero no entra sola: un administrador la activa.",
    puntos: [
      "Empleado: Punto de venta y Comandas.",
      "Administrador: todos los módulos y la configuración.",
      "Si ves un candado 🔒, ese módulo no es para tu perfil. Pídeselo a un administrador.",
      "La sesión se cierra desde tu foto, arriba a la derecha.",
    ],
  },
  {
    id: "cobrar",
    emoji: "💳",
    title: "Cobrar en el punto de venta",
    audience: "todos",
    intro: "Aquí se arma el ticket y se cobra.",
    pasos: [
      "Elige si el pedido es para aquí o para llevar.",
      "Busca el producto o filtra por categoría.",
      "Tócalo y ajusta cantidad, leche, dulzor, temperatura y extras.",
      "Escribe una nota si hace falta: se ve en la barra.",
      "Agrégalo al ticket. Para cambiarlo, tócalo otra vez; para quitarlo, usa la ✕.",
      "Marca la promoción y la propina si corresponde.",
      "Elige el método de pago. Si es efectivo, escribe con cuánto paga y verás el cambio.",
      "Pulsa «Cobrar».",
    ],
    puntos: [
      "La venta crea la comanda y descuenta los insumos de la receta.",
      "El empaque (vasos, tapas, popotes) sólo se descuenta en pedidos para llevar.",
      "Los precios no se editan en la caja: se cambian en Productos.",
      "Si la caja del día ya se cerró no se puede cobrar, hasta que un administrador reabra el turno.",
    ],
  },
  {
    id: "comandas",
    emoji: "🔔",
    title: "Comandas: sacar los pedidos",
    audience: "todos",
    intro:
      "Cada venta llega al tablero con su folio, sus productos y sus notas, y avanza de izquierda a derecha.",
    pasos: [
      "Nuevo: pulsa «Empezar preparación» cuando lo tomes.",
      "En preparación: pulsa «Marcar listo» al terminarlo.",
      "Listo: pulsa «Entregar» cuando el cliente lo recoja.",
    ],
    puntos: [
      "El botón ← regresa el pedido si te adelantaste.",
      "A los 6 minutos de espera la tarjeta se marca; a los 10 se pone roja.",
      "«Pantalla completa» deja el tablero limpio para la tablet de la barra.",
      "El tablero se actualiza solo: no hace falta recargar.",
    ],
  },
  {
    id: "inventario",
    emoji: "📦",
    title: "Inventario y productos preparados",
    audience: "admin",
    intro:
      "Las existencias se descuentan solas con cada venta. A mano sólo se registra lo que entra, lo que se tira y el conteo de la barra.",
    puntos: [
      "«Recibir pedido» suma lo que llegó; «Conteo físico» reemplaza el total por lo que contaste.",
      "Los botones + y − son ajustes rápidos: entrada y merma.",
      "Cada insumo tiene un mínimo: por debajo se marca «resurtir» y a la mitad, «crítico».",
      "Marca como empaque los vasos y las tapas, para que sólo se descuenten en pedidos para llevar.",
      "En Productos preparados se registra cada lote hecho en casa con su fecha de caducidad.",
      "El aviso del último día no se va solo: sigue en rojo hasta que alguien pulsa «Ya lo revisé».",
    ],
  },
  {
    id: "productos",
    emoji: "🧾",
    title: "Productos y menú",
    audience: "admin",
    intro:
      "El menú se edita aquí: precios, fotos, recetas y qué puede personalizar el cliente.",
    puntos: [
      "El precio se cambia desde la misma lista, sin abrir el producto.",
      "Pausar un producto lo saca de la caja sin borrarlo.",
      "La receta dice cuánto insumo gasta cada producto: es lo que permite descontar solo.",
      "En bebidas con leche, elige «Leche elegida por el cliente» y se descuenta la que se pida.",
      "Las leches y los extras se configuran una vez y valen para todo el menú.",
      "Borrar un producto no rompe el historial: cada ticket guardó su propia copia.",
    ],
  },
  {
    id: "corte",
    emoji: "💰",
    title: "Corte de caja y corregir ventas",
    audience: "admin",
    intro: "Al terminar el turno se cuadra el efectivo del cajón.",
    pasos: [
      "Revisa el efectivo esperado que calculó el sistema.",
      "Cuenta el cajón y escribe el efectivo contado.",
      "Anota en las notas lo que explique un faltante o un sobrante.",
      "Cierra el turno. Desde ese momento el punto de venta deja de cobrar.",
    ],
    puntos: [
      "Tarjeta y pagos digitales se registran para conciliarlos aparte; el sistema no los procesa.",
      "La propina del día se muestra por separado.",
      "Reabrir el turno borra el corte y vuelve a permitir el cobro.",
      "Cancelar un ticket devuelve los insumos y conserva la venta: es la forma correcta de corregir.",
      "Borrar un ticket lo elimina de la base. Es sólo para limpiar pruebas y no se puede deshacer.",
    ],
  },
  {
    id: "ajustes",
    emoji: "⚙️",
    title: "Ajustes y equipo",
    audience: "admin",
    intro: "La configuración del negocio y quién puede entrar.",
    puntos: [
      "Nombre de la sucursal, zona horaria, moneda y fondo de caja.",
      "La zona horaria decide el día del negocio y el corte; nunca se usa la del dispositivo.",
      "Apagar un módulo cambia el comportamiento real, no sólo lo que se ve.",
      "En Equipo se activan las cuentas nuevas, se cambia el rol y se da de baja a quien ya no trabaja aquí.",
      "La primera vez se puede cargar el catálogo sugerido y ajustarlo.",
    ],
  },
  {
    id: "dudas",
    emoji: "🆘",
    title: "Dudas frecuentes",
    audience: "todos",
    intro: "Lo que más se pregunta en barra.",
    puntos: [
      "No me deja cobrar: la caja del día ya se cerró y un administrador tiene que reabrir el turno.",
      "Me sale una pantalla de espera: tu cuenta todavía no está activada.",
      "Veo un candado: ese módulo es sólo para administración.",
      "Un producto no aparece en la caja: está pausado en Productos.",
      "Cobré mal: pide que cancelen el ticket antes del corte del día.",
      "El inventario no cuadra: haz un conteo físico y registra las mermas.",
    ],
  },
];

/* ------------------------------- Presentación -------------------------------- */

function SectionView({
  section,
  open,
  onToggle,
}: {
  section: Section;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl2 border border-line bg-white">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`instrucciones-${section.id}`}
          className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-cream/60"
        >
          <span className="text-lg" aria-hidden>
            {section.emoji}
          </span>
          <span className="min-w-0 flex-1 text-sm font-extrabold text-ink">
            {section.title}
          </span>
          <Badge tone={section.audience === "todos" ? "matcha" : "neutral"}>
            {section.audience === "todos" ? "Todos" : "Admin"}
          </Badge>
          <span aria-hidden className="shrink-0 text-xs font-extrabold text-muted">
            {open ? "▴" : "▾"}
          </span>
        </button>
      </h3>

      {open ? (
        <div
          id={`instrucciones-${section.id}`}
          className="space-y-4 border-t border-line px-4 py-4"
        >
          <p className="text-sm leading-6 text-muted">{section.intro}</p>

          {section.pasos ? (
            <ol className="space-y-2.5">
              {section.pasos.map((paso, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-matcha-light text-[10px] font-extrabold text-matcha-deep">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-6 text-muted">{paso}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {section.puntos ? (
            <ul className="space-y-2">
              {section.puntos.map((punto, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-matcha"
                  />
                  <span className="text-sm leading-6 text-muted">{punto}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------------- Módulo ------------------------------------ */

export function InstructionsPanel() {
  const [open, setOpen] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggleSection = (id: string) => {
    setOpenIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  return (
    <div className="card overflow-hidden border-matcha/30">
      {/* ------------------------------ Cabecera ------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-matcha-mist px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl" aria-hidden>
            📘
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Manual del sistema</p>
            <h2 className="display mt-0.5 text-xl text-ink">Instrucciones</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
              Cómo se usa el sistema, en corto. Si es tu primer día, empieza por
              la primera sección.
            </p>
          </div>
        </div>
        <Button
          variant={open ? "ghost" : "matcha"}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="instrucciones-contenido"
        >
          {open ? "Cerrar manual" : "Abrir manual"}
        </Button>
      </div>

      {/* ------------------------------ Contenido ----------------------------- */}
      {open ? (
        <div id="instrucciones-contenido" className="space-y-2.5 px-5 py-5">
          {SECTIONS.map((section) => (
            <SectionView
              key={section.id}
              section={section}
              open={openIds.includes(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
