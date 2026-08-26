"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SHOW_LEALTAD_UI } from "@/lib/feature-visibility";
import { Badge, Button, Input, cx } from "@/components/ui";

/* ============================================================================
 * Manual de operación dentro de la propia aplicación.
 *
 * Un empleado nuevo entra por primera vez en plena barra, con clientes
 * esperando: no va a leer un PDF ni a buscar un manual en otro lado. Por eso
 * las instrucciones viven arriba de la pantalla principal, las ve cualquier
 * perfil (también el empleado, que en Inicio sólo vería el candado) y arrancan
 * cerradas para no estorbar a quien ya sabe usar el sistema.
 *
 * El contenido se arma con los datos reales del negocio (zona horaria, moneda,
 * puntos, módulos encendidos) en lugar de describir un sistema genérico: lo que
 * el manual explica es exactamente lo que la persona tiene enfrente.
 * ========================================================================== */

type Block =
  | { kind: "parrafo"; text: string }
  | { kind: "pasos"; title?: string; items: string[] }
  | { kind: "lista"; title?: string; items: string[] }
  | { kind: "datos"; title?: string; items: { term: string; desc: string }[] }
  | { kind: "aviso"; tone: "matcha" | "amber" | "danger"; text: string };

interface Section {
  id: string;
  emoji: string;
  title: string;
  /** Quién usa el módulo en el día a día. */
  audience: "todos" | "admin";
  summary: string;
  blocks: Block[];
}

interface ManualContext {
  branchName: string;
  currency: string;
  timezone: string;
  pointsPerCurrency: number;
  rewardCost: number;
  inventarioOn: boolean;
  lealtadOn: boolean;
  mercadoPagoOn: boolean;
  resenasOn: boolean;
}

/* ------------------------------ Contenido ---------------------------------- */

function buildSections(ctx: ManualContext): Section[] {
  const sections: Section[] = [
    {
      id: "que-es",
      emoji: "🍵",
      title: "Qué es este sistema y cómo empezar",
      audience: "todos",
      summary:
        "Para qué sirve cada parte, qué pasa cuando cobras y cómo es un turno completo de principio a fin.",
      blocks: [
        {
          kind: "parrafo",
          text: `Esta es la aplicación con la que se opera ${ctx.branchName}: se cobra, se preparan los pedidos, se controla el inventario, se lleva el programa de lealtad y se cierra la caja. No es una demostración ni una práctica: todo lo que registres aquí es real, se guarda en la base de datos del negocio y lo ven de inmediato las demás pantallas y los reportes.`,
        },
        {
          kind: "parrafo",
          text: "Todo el equipo trabaja sobre la misma información. Si dos cajas venden al mismo tiempo, ambas ven las mismas comandas y el mismo inventario, porque nada se guarda en el dispositivo: cada acción viaja al servidor y regresa con el estado actualizado.",
        },
        {
          kind: "pasos",
          title: "Tu primer turno, paso a paso",
          items: [
            "Inicia sesión con tu correo. Si es tu primera vez, la cuenta se crea sola y queda en espera hasta que un administrador la active.",
            "Cuando ya tengas acceso, abre Punto de venta: es la pantalla donde se cobra.",
            "Arma el ticket, elige si el pedido es para aquí o para llevar, cobra y entrega el cambio.",
            "Pasa a Comandas y mueve el pedido: nuevo → en preparación → listo → entregado.",
            "Al terminar el turno, un administrador hace el Corte de caja: cuenta el efectivo del cajón y lo concilia con lo que el sistema esperaba.",
          ],
        },
        {
          kind: "lista",
          title: "Qué resuelve cada módulo",
          items: [
            "Punto de venta — cobrar, personalizar bebidas, aplicar promoción y propina.",
            "Comandas — el tablero de la barra: qué se está preparando y qué falta entregar.",
            "Inventario — cuánto queda de cada insumo; se descuenta solo con cada venta.",
            "Productos preparados — lotes hechos en casa (jarabes, pasteles) y sus caducidades.",
            "Productos — el menú: precios, fotos, recetas y qué se puede personalizar.",
            "Reportes — ingresos, productos más vendidos, métodos de pago y horas pico.",
            "Administración de pedidos — corregir o eliminar tickets capturados por error.",
            "Corte de caja — cerrar el turno y cuadrar el efectivo.",
            "Ajustes — datos del negocio, módulos encendidos y quién puede entrar.",
          ],
        },
        {
          kind: "aviso",
          tone: "amber",
          text: "Cada venta descuenta insumos de verdad y suma puntos de verdad. Si quieres practicar, avísale a un administrador: él puede borrar los tickets de prueba desde Administración de pedidos.",
        },
      ],
    },

    {
      id: "acceso",
      emoji: "🔐",
      title: "Entrar, perfiles y permisos",
      audience: "todos",
      summary:
        "Cómo se crea tu cuenta, por qué a veces aparece una pantalla de espera y qué puede hacer cada perfil.",
      blocks: [
        {
          kind: "pasos",
          title: "Cómo se obtiene el acceso",
          items: [
            "Inicia sesión con tu correo desde la pantalla de acceso.",
            "La cuenta se crea automáticamente, pero entra como empleado y sin activar.",
            "Mientras no esté activada verás una pantalla de espera: es a propósito, registrarse no debe alcanzar para entrar a la caja.",
            "Un administrador te activa en Ajustes → Equipo y, si hace falta, te cambia el rol.",
            "Vuelve a cargar la página y ya podrás trabajar.",
          ],
        },
        {
          kind: "datos",
          title: "Qué puede hacer cada perfil",
          items: [
            {
              term: "Empleado",
              desc: "Punto de venta y Comandas. Es todo lo que se necesita para atender la barra: cobrar y sacar los pedidos.",
            },
            {
              term: "Administrador",
              desc: "Todos los módulos: inventario, productos, preparados, reportes, corte de caja, administración de pedidos y ajustes. Además puede cancelar y borrar tickets.",
            },
          ],
        },
        {
          kind: "lista",
          title: "Detalles que evitan confusiones",
          items: [
            "Tu sesión se cierra desde tu foto, arriba a la derecha de la pantalla.",
            "Si abres un módulo que no te corresponde verás un candado 🔒 y un botón para volver al punto de venta. No es un error: es tu perfil.",
            "El rol y el estado del turno se leen siempre abajo del menú lateral (por ejemplo «Empleado · turno abierto»).",
            "Un administrador puede desactivar una cuenta sin borrarla: deja de entrar, pero su historial de ventas se conserva.",
          ],
        },
      ],
    },

    {
      id: "navegacion",
      emoji: "🧭",
      title: "Cómo moverte por la pantalla",
      audience: "todos",
      summary:
        "Menú, avisos, números en rojo, el indicador de «Guardando» y cada cuánto se actualiza la información.",
      blocks: [
        {
          kind: "lista",
          title: "En computadora y en tablet",
          items: [
            "El menú de la izquierda lista los módulos a los que tienes acceso; el módulo abierto se marca en verde.",
            "Arriba se ve la fecha del negocio, tu rol y tu cuenta.",
          ],
        },
        {
          kind: "lista",
          title: "En celular",
          items: [
            "Abajo hay una barra con lo más usado: Inicio, Venta y Comandas.",
            "El botón «Más» abre el resto de los módulos en una ventana.",
          ],
        },
        {
          kind: "datos",
          title: "Qué significan los avisos",
          items: [
            {
              term: "Número verde junto a un módulo",
              desc: "Algo requiere atención: comandas activas, insumos por resurtir, lotes por vencer o cuentas del equipo pendientes de activar.",
            },
            {
              term: "«Guardando» con un punto que late",
              desc: "Se está enviando una acción al servidor. Espera a que desaparezca antes de cerrar la pantalla.",
            },
            {
              term: "Franja ámbar arriba",
              desc: "La caja del día ya se cerró y el cobro está pausado. Sólo un administrador puede reabrir el turno.",
            },
            {
              term: "Mensajes que aparecen abajo",
              desc: "Confirman lo que acaba de pasar («Venta #12 registrada») o avisan de un problema. Se van solos.",
            },
          ],
        },
        {
          kind: "parrafo",
          text: "La información se refresca sola cada 15 segundos mientras la pestaña está a la vista, y además después de cada acción. No hace falta recargar la página para ver la comanda que acaba de cobrar la otra caja.",
        },
      ],
    },

    {
      id: "pos",
      emoji: "💳",
      title: "Punto de venta: cobrar paso a paso",
      audience: "todos",
      summary:
        "Armar el ticket, personalizar la bebida, aplicar promoción y propina, elegir método de pago y calcular el cambio.",
      blocks: [
        {
          kind: "pasos",
          title: "El cobro, de principio a fin",
          items: [
            "Elige dónde se consume: «Para aquí» o «Para llevar». Empieza siempre en «Para llevar».",
            "Busca el producto por nombre o filtra por categoría (Matcha, Café, Té e infusiones, Bakery).",
            "Toca el producto: se abre su ventana de personalización.",
            "Ajusta cantidad, leche, nivel de dulzor (de 0 % a 100 %), frío o caliente y los extras que pida el cliente. Sólo aparece lo que ese producto permite personalizar.",
            "Escribe una nota si hace falta («sin popote», «para Ana»): la nota se ve en la comanda de la barra.",
            "Agrega el renglón al ticket. Para cambiarlo, tócalo otra vez; para quitarlo, usa la ✕.",
            "Aplica una promoción si corresponde (10 % o cliente frecuente 15 %).",
            ctx.lealtadOn && SHOW_LEALTAD_UI
              ? "Elige al cliente de lealtad si está registrado, para que sume sus puntos."
              : "Repite con todos los productos del pedido hasta cerrar el ticket.",
            "Marca la propina: 10 %, 15 %, 20 %, «Sin propina» o escribe el monto exacto.",
            `Elige el método de pago: efectivo, tarjeta${ctx.mercadoPagoOn ? " o Mercado Pago" : ""}.`,
            "Si es efectivo, escribe con cuánto paga el cliente (o usa los botones Exacto / $200 / $500): el sistema calcula el cambio.",
            "Pulsa «Cobrar». Aparece el folio de la venta y el ticket queda registrado.",
          ],
        },
        {
          kind: "lista",
          title: "Qué ocurre en el momento de cobrar",
          items: [
            "Se crea la comanda con su folio y aparece al instante en el tablero de la barra.",
            ctx.inventarioOn
              ? "Se descuentan los insumos según la receta de cada producto, incluida la leche que eligió el cliente."
              : "El descuento de inventario está apagado en Ajustes, así que la venta no toca las existencias.",
            "El empaque (vasos, tapas, popotes, bolsas) sólo se descuenta si el pedido es para llevar.",
            ctx.lealtadOn
              ? `Si elegiste cliente, se le suman ${ctx.pointsPerCurrency} punto${ctx.pointsPerCurrency === 1 ? "" : "s"} por cada peso de la compra.`
              : "El programa de lealtad está apagado, así que no se otorgan puntos.",
            "Se actualizan el resumen del día, los reportes y el corte de caja.",
          ],
        },
        {
          kind: "datos",
          title: "Reglas del cobro que conviene saber",
          items: [
            {
              term: "Los precios no se editan en la caja",
              desc: "El total lo calcula el servidor releyendo el precio del producto, el cargo de la leche y el de los extras. Para cambiar un precio hay que hacerlo en Productos.",
            },
            {
              term: "La propina nunca pasa del consumo",
              desc: "Un monto mayor a la cuenta es siempre un error de dedo, así que el sistema lo tope. La propina se calcula sobre el consumo ya con descuento y se suma aparte, para que una promoción no le recorte al equipo lo que el cliente quiso dejar.",
            },
            {
              term: "Para aquí no gasta empaque",
              desc: "Si el cliente se queda, se sirve en loza y los vasos no se descuentan. Por eso vale la pena marcarlo bien.",
            },
            {
              term: "En celular",
              desc: "El ticket se abre con el botón inferior; ahí están los totales y el botón de cobrar.",
            },
          ],
        },
        {
          kind: "aviso",
          tone: "amber",
          text: "Si la caja del día ya se cerró, el botón de cobrar se bloquea. Pídele a un administrador que reabra el turno desde Corte de caja.",
        },
      ],
    },

    {
      id: "comandas",
      emoji: "🔔",
      title: "Comandas: el tablero de la barra",
      audience: "todos",
      summary:
        "Los cuatro estados de un pedido, los avisos por tiempo de espera y el modo pantalla completa.",
      blocks: [
        {
          kind: "parrafo",
          text: "Cada venta cobrada llega aquí como una tarjeta con su folio, la hora, si es para aquí o para llevar, todos los productos con sus modificadores y las notas del cliente. El tablero tiene cuatro columnas y el pedido avanza de izquierda a derecha.",
        },
        {
          kind: "pasos",
          title: "Cómo avanza un pedido",
          items: [
            "Nuevo — acaba de cobrarse. Pulsa «Empezar preparación» cuando lo tomes.",
            "En preparación — lo estás haciendo. Pulsa «Marcar listo» al terminarlo.",
            "Listo — espera en barra. Pulsa «Entregar» cuando el cliente lo recoja.",
            "Entregado — sale del flujo activo y queda en el historial del día.",
          ],
        },
        {
          kind: "lista",
          title: "Detalles del tablero",
          items: [
            "El botón ← regresa el pedido al estado anterior si te adelantaste.",
            "Cada tarjeta muestra los minutos de espera: a los 6 minutos se marca en ámbar y a los 10 se resalta en rojo.",
            "«Pantalla completa» deja el tablero sin menús alrededor, ideal para una tablet fija en la barra.",
            "Los tickets cancelados del día quedan agrupados abajo, plegados.",
            "Un administrador puede cancelar el ticket (devuelve insumos y puntos) o borrarlo desde la misma tarjeta.",
            "El tablero se actualiza solo: no hace falta recargar para ver lo que cobró la otra caja.",
          ],
        },
      ],
    },

    {
      id: "inventario",
      emoji: "📦",
      title: "Inventario de insumos",
      audience: "admin",
      summary:
        "Alta de insumos, recibir mercancía, conteo físico, alertas de resurtido y el consumo por producto.",
      blocks: [
        {
          kind: "parrafo",
          text: "Aquí viven las existencias: matcha, leches, jarabes, vasos, bakery. No se capturan a mano cada día — cada venta descuenta sola lo que dice la receta del producto. Lo que sí se registra a mano es lo que entra (mercancía recibida), lo que se tira (merma) y el conteo físico de la barra.",
        },
        {
          kind: "pasos",
          title: "Dar de alta un insumo",
          items: [
            "Pulsa «Nuevo insumo» y escribe su nombre.",
            "Elige la unidad con la que se mide: gramos, mililitros o piezas.",
            "Opcional: define el nivel objetivo, es decir, cuánto cabe cuando está lleno.",
            "Fija el umbral de alerta. Si hay nivel objetivo, puedes fijarlo como porcentaje («avisar al 25 %») y el mínimo se calcula solo.",
            "Anota el uso semanal aproximado si lo conoces: sirve de referencia para resurtir.",
            "Captura la existencia inicial contando la barra, no adivinando.",
            "Marca «Es empaque» en vasos, tapas, popotes y bolsas: eso hace que sólo se descuenten en pedidos para llevar.",
          ],
        },
        {
          kind: "datos",
          title: "Los dos movimientos que más se confunden",
          items: [
            {
              term: "Recibir pedido",
              desc: "Suma lo que llegó a lo que ya había. Recibir 200 vasos deja 200 vasos más de los que tenías.",
            },
            {
              term: "Conteo físico",
              desc: "Reemplaza el total por lo que contaste. Si cuentas 200 vasos, quedan 200 vasos exactos, sin importar lo que decía el sistema.",
            },
            {
              term: "Botones + y −",
              desc: "Ajustes rápidos de una cantidad fija: el + registra una entrada y el − una merma.",
            },
            {
              term: "Panel de consumo",
              desc: "Cada insumo abre la lista de productos que lo usan y con cuánto. Ahí mismo se corrige la receta o se agrega el insumo a otro producto.",
            },
          ],
        },
        {
          kind: "lista",
          title: "Cuándo avisa el sistema",
          items: [
            "Por debajo del mínimo el insumo se marca «resurtir».",
            "A la mitad del mínimo pasa a «crítico» y aparece en el resumen de Inicio.",
            "Los insumos en alerta se cuentan en el número verde del menú, junto a Inventario.",
            "Todo movimiento queda registrado (quién, cuánto y por qué), así que el faltante siempre se puede rastrear.",
          ],
        },
        {
          kind: "aviso",
          tone: "matcha",
          text: "Las leches aparecen en el panel de su propio insumo aunque la receta las lleve como «leche elegida por el cliente». Esa cantidad es la misma para cualquier leche, así que cambiarla vale para todas.",
        },
      ],
    },

    {
      id: "preparados",
      emoji: "🧁",
      title: "Productos preparados y caducidades",
      audience: "admin",
      summary:
        "Registrar lotes hechos en casa, la cuenta regresiva y por qué el aviso del último día no se va solo.",
      blocks: [
        {
          kind: "parrafo",
          text: "Jarabes, mermeladas, roles, pasteles: todo lo que se elabora en casa se registra como un lote con su fecha de elaboración y su caducidad. El sistema lleva la cuenta regresiva y avisa antes de que se venza.",
        },
        {
          kind: "pasos",
          title: "Registrar un lote",
          items: [
            "Pulsa «Nuevo lote» y escribe qué se preparó.",
            "Anota la cantidad y su unidad.",
            "Pon la fecha en que se elaboró y la fecha de caducidad: de ahí sale la cuenta regresiva.",
            "Usa las notas para decir dónde quedó guardado o de qué tanda es.",
          ],
        },
        {
          kind: "lista",
          title: "Cómo funcionan los avisos",
          items: [
            "La lista se ordena por lo que vence primero.",
            "A tres días o menos el lote se marca «por vencer»; en el último día pasa a rojo, y si ya venció se marca «caducado».",
            "El aviso del último día no desaparece solo: sigue en rojo hasta que alguien pulsa «Ya lo revisé».",
            "Cambiar la fecha de caducidad reinicia el aviso, para que nadie herede una revisión vieja.",
            "«Desechar» retira el lote de la lista cuando ya no sirve.",
          ],
        },
      ],
    },

    {
      id: "productos",
      emoji: "🍵",
      title: "Productos, recetas y opciones del menú",
      audience: "admin",
      summary:
        "Crear productos, cambiar precios, definir la receta que descuenta inventario y gestionar leches y extras.",
      blocks: [
        {
          kind: "parrafo",
          text: "El menú vive aquí y se edita sin depender de nadie: precios, fotos, descripciones, recetas y qué puede personalizar el cliente en la caja.",
        },
        {
          kind: "pasos",
          title: "Crear un producto",
          items: [
            "Pulsa «Nuevo producto» y escribe el nombre.",
            "Elige un emoji (se usa cuando no hay foto) y sube una imagen si la tienes.",
            "Elige la categoría y escribe el precio y la descripción que verá el cajero.",
            "Marca si está activo en el menú y si quieres destacarlo como popular.",
            "Define la receta: qué insumo consume y cuánto. Para bebidas con leche, elige «Leche elegida por el cliente» y el sistema descuenta la que se pida en la caja.",
            "Elige qué se puede personalizar: leche, dulzor, temperatura y extras.",
          ],
        },
        {
          kind: "lista",
          title: "Cosas que se hacen a diario",
          items: [
            "Cambiar un precio se hace en la misma lista, sin abrir el producto.",
            "Pausar un producto lo saca de la caja sin borrarlo: útil cuando se acabó el insumo.",
            "«Sin receta» avisa que ese producto no descuenta inventario todavía.",
            "Las leches son globales: se define su cargo extra y qué insumo descuentan.",
            "Los extras también son globales: precio propio y su propia receta.",
            "Un producto se puede borrar siempre, tenga ventas o no: los tickets viejos guardaron su propia copia (nombre, precio, foto) y los reportes lo siguen contando marcado como «fuera del menú». Lo que se pierde es la receta.",
          ],
        },
      ],
    },
  ];

  if (SHOW_LEALTAD_UI) {
    sections.push({
      id: "clientes",
      emoji: "💚",
      title: "Clientes y programa de lealtad",
      audience: "admin",
      summary:
        "Registrar clientes, cómo se acumulan y se canjean los puntos, y la tarjeta digital con QR.",
      blocks: [
        {
          kind: "parrafo",
          text: `Cada cliente registrado acumula ${ctx.pointsPerCurrency} punto${ctx.pointsPerCurrency === 1 ? "" : "s"} por cada peso de compra y tiene su tarjeta digital con un QR escaneable. El canje de una bebida cuesta ${ctx.rewardCost} puntos.`,
        },
        {
          kind: "pasos",
          title: "Cómo se usa",
          items: [
            "Registra al cliente con su nombre y teléfono (el correo y las notas son opcionales).",
            "En la caja, elígelo antes de cobrar para que la compra le sume puntos.",
            "Abre su ficha para ver puntos, visitas, nivel y su QR.",
            "Cuando junte los puntos suficientes, usa «Canjear bebida»: los puntos se descuentan y queda registrado.",
          ],
        },
        {
          kind: "lista",
          title: "Detalles",
          items: [
            "La tarjeta se abre escaneando el QR: el cliente ve sus puntos sin instalar nada.",
            "Los movimientos de puntos quedan registrados, así que siempre se puede explicar un saldo.",
            "Si el programa de lealtad se apaga en Ajustes, deja de sumar puntos y de pedir cliente al cobrar.",
            ctx.resenasOn
              ? "Desde aquí también se imprime el QR de reseñas de Google que se pone en barra."
              : "El módulo de reseñas de Google está apagado en Ajustes.",
          ],
        },
      ],
    });
  }

  sections.push(
    {
      id: "reportes",
      emoji: "📈",
      title: "Reportes",
      audience: "admin",
      summary:
        "Ingresos, ticket promedio, productos más vendidos, métodos de pago y horas pico.",
      blocks: [
        {
          kind: "lista",
          title: "Qué encuentras aquí",
          items: [
            "Ingresos, número de tickets, ticket promedio, piezas vendidas y propina del periodo.",
            "Ventas por día de los últimos 7 días.",
            "Los productos más vendidos, con los que ya salieron del menú marcados como «fuera del menú».",
            "Reparto por método de pago, para conciliar tarjeta y pagos digitales.",
            "Horas pico, para decidir horarios y personal.",
          ],
        },
        {
          kind: "aviso",
          tone: "matcha",
          text: "Los reportes trabajan con las ventas de los últimos días para que la aplicación siga siendo rápida. El histórico completo no se pierde: vive en la base de datos y se consulta desde Supabase.",
        },
      ],
    },

    {
      id: "pedidos",
      emoji: "🧾",
      title: "Administración de pedidos: corregir y borrar",
      audience: "admin",
      summary:
        "La diferencia entre cancelar, quitar un renglón y borrar un ticket, y en qué orden se limpian los datos de prueba.",
      blocks: [
        {
          kind: "datos",
          title: "Tres acciones que no son lo mismo",
          items: [
            {
              term: "Cancelar un ticket",
              desc: "La venta se conserva marcada como cancelada, se devuelven los insumos y se retiran los puntos. Es la herramienta del día a día: la venta ocurrió y el historial tiene que poder explicarla. Sólo se puede antes del corte de ese día.",
            },
            {
              term: "Quitar un renglón",
              desc: "Elimina un solo producto del ticket, devuelve sus insumos y rehace subtotal, total y puntos. La propina se conserva y sólo se recorta si el consumo baja por debajo de ella. El último renglón no se puede quitar: un ticket vacío no significa nada.",
            },
            {
              term: "Borrar el ticket",
              desc: "La venta desaparece de la base y de los reportes. Existe para limpiar capturas de prueba, no para operar. Antes de borrar se devuelven insumos y puntos, y tampoco se puede si el día ya tiene corte cerrado.",
            },
          ],
        },
        {
          kind: "pasos",
          title: "Orden para limpiar datos de prueba",
          items: [
            "Primero borra la venta: mientras exista, sus movimientos sostienen al insumo.",
            "Después borra el producto: su receta sostiene al insumo.",
            "Al final ya se puede borrar el insumo.",
          ],
        },
        {
          kind: "aviso",
          tone: "danger",
          text: "Borrar no se puede deshacer. Si dudas entre cancelar y borrar, cancela: conserva la información y devuelve insumos y puntos igual.",
        },
      ],
    },

    {
      id: "corte",
      emoji: "💰",
      title: "Corte de caja",
      audience: "admin",
      summary:
        "Cerrar el turno, cuadrar el efectivo, separar la propina y qué pasa si hay que reabrir.",
      blocks: [
        {
          kind: "pasos",
          title: "Cerrar el turno",
          items: [
            "Revisa el efectivo esperado que calculó el sistema con las ventas del día.",
            "Cuenta el dinero del cajón.",
            "Escribe el efectivo contado: el sistema calcula la diferencia y la deja registrada.",
            "Anota en las notas cualquier cosa que explique un faltante o un sobrante.",
            "Pulsa cerrar. A partir de ese momento el punto de venta deja de cobrar.",
          ],
        },
        {
          kind: "lista",
          title: "Lo que el corte separa",
          items: [
            "Efectivo esperado frente a efectivo contado, con su diferencia.",
            `Tarjeta y ${ctx.mercadoPagoOn ? "Mercado Pago" : "pagos digitales"}, que se registran pero no se procesan aquí: sirven para conciliar contra el estado de cuenta.`,
            "La propina del día y, aparte, la parte cobrada en efectivo, que es la que se reparte.",
            "El fondo de caja configurado en Ajustes, como referencia informativa.",
          ],
        },
        {
          kind: "aviso",
          tone: "amber",
          text: "Reabrir el turno elimina el registro del corte y vuelve a permitir el cobro. Úsalo sólo si el corte se hizo por error: los cortes anteriores quedan en el historial.",
        },
      ],
    },

    {
      id: "ajustes",
      emoji: "⚙️",
      title: "Ajustes: negocio, módulos y equipo",
      audience: "admin",
      summary:
        "Datos del negocio, zona horaria, módulos que se pueden apagar, catálogo inicial y control del equipo.",
      blocks: [
        {
          kind: "datos",
          title: "Qué se configura",
          items: [
            {
              term: "Identidad y operación",
              desc: `Nombre de la sucursal, zona horaria (${ctx.timezone}), moneda (${ctx.currency}) y fondo de caja.`,
            },
            {
              term: "Lealtad",
              desc: "Cuántos puntos da cada peso y cuántos puntos cuesta canjear una bebida.",
            },
            {
              term: "Reseñas de Google",
              desc: "El enlace del negocio genera el QR imprimible; la calificación y el número de reseñas se capturan a mano.",
            },
            {
              term: "Logo",
              desc: "La imagen del negocio, que se sube igual que las fotos de producto.",
            },
            {
              term: "Equipo",
              desc: "Quién puede entrar: activar cuentas nuevas, cambiar de empleado a administrador y desactivar a quien ya no trabaja aquí.",
            },
            {
              term: "Conexiones",
              desc: "Estado de los servicios (base de datos, sesión, imágenes). Si algo falta, se ve aquí.",
            },
          ],
        },
        {
          kind: "lista",
          title: "Módulos que se pueden apagar",
          items: [
            "Inventario — apagado, las ventas dejan de descontar existencias.",
            "Lealtad y clientes — apagado, no se otorgan puntos ni se elige cliente al cobrar.",
            "Reseñas de Google — muestra u oculta el QR y la calificación.",
            "Mercado Pago — agrega o quita ese método de pago en la caja.",
          ],
        },
        {
          kind: "aviso",
          tone: "amber",
          text: "Apagar un módulo cambia el comportamiento real del sistema, no sólo lo que se ve. Piensa el efecto antes de mover un interruptor a media operación.",
        },
        {
          kind: "parrafo",
          text: "La base arranca vacía a propósito. Para no capturar decenas de insumos y productos el primer día, Ajustes ofrece cargar el catálogo sugerido, que después se edita libremente. Las existencias arrancan en cero porque el inventario real se cuenta, no se adivina.",
        },
      ],
    },

    {
      id: "reglas",
      emoji: "🛡️",
      title: "Cómo funciona por dentro",
      audience: "todos",
      summary:
        "Las reglas que explican por qué el sistema se comporta como se comporta.",
      blocks: [
        {
          kind: "lista",
          items: [
            "Los precios los pone el servidor. La caja envía qué se pidió y cuánto, nunca el precio: el total se recalcula leyendo el menú de la base.",
            "Cobrar es una sola operación. El ticket, el descuento de insumos, los movimientos y los puntos ocurren juntos: o queda todo, o no queda nada.",
            "Cada acción devuelve el estado completo. Por eso la pantalla siempre muestra lo último, aunque otra caja haya vendido hace un segundo.",
            `El día operativo usa la zona horaria del negocio (${ctx.timezone}), no la del dispositivo. Abrir el panel desde otro huso horario no cambia el corte.`,
            "Nadie lee la base de datos desde fuera. El único camino es el servidor de la aplicación, después de comprobar quién eres y qué puedes hacer.",
            "Todo movimiento de inventario y de puntos queda auditado: quién, cuánto y por qué.",
            "La aplicación carga los últimos días de ventas para ser rápida; el histórico completo permanece en la base de datos.",
            "Los pagos con tarjeta y Mercado Pago se registran, no se procesan: no hay terminal conectada, el corte los separa para conciliarlos.",
          ],
        },
      ],
    },

    {
      id: "problemas",
      emoji: "🆘",
      title: "Problemas frecuentes",
      audience: "todos",
      summary: "Lo que más se pregunta en barra, con su solución inmediata.",
      blocks: [
        {
          kind: "datos",
          items: [
            {
              term: "«No me deja cobrar»",
              desc: "Casi siempre es que la caja del día ya se cerró: un administrador debe reabrir el turno en Corte de caja. Si en cambio la carta aparece vacía, faltan productos activos en el menú.",
            },
            {
              term: "«Me sale una pantalla de espera»",
              desc: "Tu cuenta existe pero no está activada. Un administrador la activa en Ajustes → Equipo.",
            },
            {
              term: "«Me aparece un candado»",
              desc: "Ese módulo es sólo para administración. Tu perfil de empleado trabaja en Punto de venta y Comandas.",
            },
            {
              term: "«El inventario no cuadra»",
              desc: "Haz un conteo físico para dejar la existencia real, registra las mermas con el botón −, y revisa que los productos que se venden tengan receta. Si el módulo de inventario está apagado, las ventas no descuentan nada.",
            },
            {
              term: "«Un producto no aparece en la caja»",
              desc: "Está pausado o no está activo en el menú. Se enciende desde Productos.",
            },
            {
              term: "«Cobré mal un ticket»",
              desc: "Pídele a un administrador que lo cancele: devuelve insumos y puntos. Se puede mientras no se haya cerrado el corte de ese día.",
            },
            {
              term: "«No sube la foto»",
              desc: "El límite es 25 MB por archivo, y el servicio de imágenes tiene que estar configurado. Si no lo está, la propia pantalla lo dice.",
            },
            {
              term: "«Aparece un aviso de configuración»",
              desc: "Falta conectar algún servicio. El aviso nombra exactamente qué falta; lo resuelve quien administra la instalación.",
            },
          ],
        },
      ],
    },

    {
      id: "glosario",
      emoji: "📖",
      title: "Glosario",
      audience: "todos",
      summary: "Las palabras que se usan en el sistema, en una línea cada una.",
      blocks: [
        {
          kind: "datos",
          items: [
            { term: "Folio", desc: "El número consecutivo de una venta. Es como se nombra un pedido en barra." },
            { term: "Comanda", desc: "El pedido visto desde la barra: qué preparar y en qué estado va." },
            { term: "Ticket", desc: "La venta con todos sus renglones, su total y su método de pago." },
            { term: "Insumo", desc: "Materia prima o material: matcha, leche, vasos, bakery." },
            { term: "Receta", desc: "Cuánto insumo consume un producto. Es lo que permite descontar solo." },
            { term: "Empaque", desc: "Insumos que sólo se gastan en pedidos para llevar." },
            { term: "Merma", desc: "Producto o insumo que se pierde o se tira, y se descuenta a mano." },
            { term: "Nivel objetivo", desc: "Cuánto cabe de un insumo cuando está lleno; sirve para fijar la alerta como porcentaje." },
            { term: "Umbral o mínimo", desc: "La cantidad a partir de la cual el insumo entra en alerta." },
            { term: "Lote", desc: "Una tanda de producto preparado en casa, con su fecha de caducidad." },
            { term: "Día operativo", desc: "El día del negocio según su zona horaria; es el que usa el corte." },
            { term: "Corte de caja", desc: "El cierre del turno: cuadra el efectivo contado contra el esperado." },
            { term: "Consumo", desc: "Lo que se cobra por los productos, ya con descuento y sin contar la propina." },
          ],
        },
      ],
    },
  );

  return sections;
}

/* ------------------------------- Presentación -------------------------------- */

function BlockView({ block }: { block: Block }) {
  if (block.kind === "parrafo") {
    return <p className="text-sm leading-6 text-muted">{block.text}</p>;
  }

  if (block.kind === "aviso") {
    return (
      <p
        className={cx(
          "rounded-xl2 border px-4 py-3 text-sm leading-6",
          block.tone === "matcha" && "border-matcha/30 bg-matcha-mist text-ink",
          block.tone === "amber" && "border-amber/30 bg-amber/5 text-ink",
          block.tone === "danger" && "border-danger/30 bg-danger/5 text-ink",
        )}
      >
        {block.text}
      </p>
    );
  }

  if (block.kind === "pasos") {
    return (
      <div>
        {block.title ? (
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink">
            {block.title}
          </p>
        ) : null}
        <ol className="mt-2.5 space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-matcha-light text-[10px] font-extrabold text-matcha-deep">
                {i + 1}
              </span>
              <span className="text-sm leading-6 text-muted">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block.kind === "lista") {
    return (
      <div>
        {block.title ? (
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink">
            {block.title}
          </p>
        ) : null}
        <ul className="mt-2.5 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-matcha" />
              <span className="text-sm leading-6 text-muted">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      {block.title ? (
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink">
          {block.title}
        </p>
      ) : null}
      <dl className="mt-2.5 space-y-2.5">
        {block.items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl2 border border-line bg-paper px-4 py-3"
          >
            <dt className="text-sm font-extrabold text-ink">{item.term}</dt>
            <dd className="mt-0.5 text-sm leading-6 text-muted">{item.desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Texto plano de una sección, para poder buscar dentro del manual. */
function haystack(section: Section): string {
  const parts = [section.title, section.summary];
  for (const block of section.blocks) {
    if (block.kind === "parrafo" || block.kind === "aviso") {
      parts.push(block.text);
    } else if (block.kind === "datos") {
      if (block.title) parts.push(block.title);
      for (const item of block.items) parts.push(item.term, item.desc);
    } else {
      if (block.title) parts.push(block.title);
      parts.push(...block.items);
    }
  }
  return parts.join(" ").toLowerCase();
}

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
    <section
      id={`instrucciones-${section.id}`}
      className="scroll-mt-24 overflow-hidden rounded-xl2 border border-line bg-white"
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`instrucciones-cuerpo-${section.id}`}
          className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-cream/60"
        >
          <span className="text-lg" aria-hidden>
            {section.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-ink">
              {section.title}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              {section.summary}
            </span>
          </span>
          <Badge tone={section.audience === "todos" ? "matcha" : "neutral"}>
            {section.audience === "todos" ? "Todos" : "Admin"}
          </Badge>
          <span
            aria-hidden
            className="shrink-0 text-xs font-extrabold text-muted"
          >
            {open ? "▴" : "▾"}
          </span>
        </button>
      </h3>
      {open ? (
        <div
          id={`instrucciones-cuerpo-${section.id}`}
          className="space-y-4 border-t border-line px-4 py-4"
        >
          {section.blocks.map((block, i) => (
            <BlockView key={i} block={block} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------------- Módulo ------------------------------------ */

export function InstructionsPanel() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);

  const sections = useMemo(
    () =>
      buildSections({
        branchName: state.settings.branchName,
        currency: state.settings.currency,
        timezone: state.settings.timezone,
        pointsPerCurrency: state.settings.pointsPerCurrency,
        rewardCost: state.settings.rewardCost,
        inventarioOn: state.flags.inventario,
        lealtadOn: state.flags.lealtad,
        mercadoPagoOn: state.flags.mercadoPago,
        resenasOn: state.flags.resenasGoogle,
      }),
    [state.settings, state.flags],
  );

  const term = query.trim().toLowerCase();
  const visible = term
    ? sections.filter((s) => haystack(s).includes(term))
    : sections;

  const toggleSection = (id: string) => {
    setOpenIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const goToSection = (id: string) => {
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    // El contenido se pinta en este mismo ciclo; el desplazamiento espera al
    // siguiente cuadro para que la sección ya exista abierta.
    requestAnimationFrame(() => {
      document
        .getElementById(`instrucciones-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
              Cómo funciona todo, módulo por módulo y paso a paso. Si es tu
              primer día, empieza por «Qué es este sistema y cómo empezar».
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
        <div id="instrucciones-contenido" className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el manual: propina, merma, corte…"
              aria-label="Buscar en el manual"
              className="max-w-xs rounded-full"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpenIds(sections.map((s) => s.id))}
            >
              Abrir todo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpenIds([])}>
              Cerrar todo
            </Button>
          </div>

          {/* Índice: lleva a la sección y la abre. */}
          <nav aria-label="Índice del manual" className="flex flex-wrap gap-2">
            {sections.map((section, i) => (
              <button
                key={section.id}
                type="button"
                onClick={() => goToSection(section.id)}
                className="focus-ring rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink transition hover:border-matcha hover:text-matcha-deep"
              >
                <span className="mr-1 text-muted">{i + 1}.</span>
                {section.title}
              </button>
            ))}
          </nav>

          <div className="space-y-2.5">
            {visible.map((section) => (
              <SectionView
                key={section.id}
                section={section}
                open={openIds.includes(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
            {!visible.length ? (
              <p className="rounded-xl2 border border-dashed border-line px-4 py-10 text-center text-sm leading-6 text-muted">
                Ninguna sección menciona «{query.trim()}». Prueba con otra
                palabra, o pregúntale a un administrador.
              </p>
            ) : null}
          </div>

          <p className="border-t border-line pt-4 text-xs leading-5 text-muted">
            ¿Falta algo aquí? Díselo a un administrador: el manual se actualiza
            junto con el sistema.
          </p>
        </div>
      ) : null}
    </div>
  );
}
