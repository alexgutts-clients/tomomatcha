# MANUAL DE TOMOMATCHA · SISTEMA DE OPERACIÓN

Este documento es todo lo que el asistente sabe del sistema. Describe la aplicación tal como está hoy. Si algo no está aquí, el asistente no lo sabe y debe decirlo.

Convenciones:
- El texto entre «comillas angulares» es el texto exacto que aparece en la pantalla (botones, títulos, avisos).
- **[Todos]** = pueden usarlo administradores y empleados. **[Solo administradores]** = únicamente perfil Administrador.
- «Hoy» siempre significa el día operativo del negocio, calculado con la zona horaria configurada en Ajustes, no con la del dispositivo.
- Los precios, productos y nombres que aparecen como ejemplo son del catálogo sugerido de TomoMatcha; el negocio real puede tener otros. Lo que manda es el CONTEXTO EN VIVO y lo que la persona ve en su pantalla.

---

## ÍNDICE
1. Lo esencial · 2. Cómo es la pantalla · 3. Perfiles y permisos · 4. Inicio · 5. Punto de venta · 6. ¿Por qué no me deja cobrar? · 7. Corte de caja · 8. Reportes · 9. Ajustes · 10. Comandas · 11. Administración de pedidos (cancelar, quitar, borrar) · 12. Inventario · 13. Productos preparados · 14. Productos, categorías, leches y extras · 15. Clientes y lealtad (oculto hoy) · 16. Cómo funciona por dentro · 17. Lo que el sistema NO hace · 18. Situaciones frecuentes (incluye «se me olvidó registrar un día») · 19. Preguntas rápidas · 20. Mensajes de error · 21. Glosario · 22. Cuándo avisar a quien instaló el sistema

---

## 1. LO ESENCIAL EN UN VISTAZO

**Qué es.** Una aplicación web con la que se opera la cafetería: se cobra (Punto de venta), se preparan los pedidos (Comandas), se controla el inventario de insumos, se registran productos preparados en casa con caducidad, se ven reportes y se cierra la caja al terminar el día. No es una demostración: todo lo que se registra es real y lo ven de inmediato todos los dispositivos.

**Cómo se usa en un turno normal:**
1. Iniciar sesión con el correo.
2. Punto de venta: armar el ticket, elegir «Para aquí» o «Para llevar», elegir el pago y pulsar «Cobrar».
3. Comandas: mover el pedido por los estados Nuevo → En preparación → Listo → Entregado.
4. Al terminar el día, un administrador hace el Corte de caja.

**Dos perfiles:**
- **Empleado**: Punto de venta, Comandas, Inventario y Productos (en Inventario y Productos con limitaciones, ver sección 3).
- **Administrador**: todo, incluidos Inicio, Preparados, Reportes, Administración de pedidos, Corte de caja y Ajustes.

**Cuatro cosas que el sistema hace solo cada vez que se cobra:** crea la comanda con su folio, descuenta los insumos según la receta del producto (si Inventario está encendido), separa la propina del consumo y actualiza el resumen, los reportes y el corte de caja.

**Lo que más se pregunta y su respuesta corta:**
- «No me deja cobrar»: casi siempre es una de estas cuatro cosas: (1) la caja del día ya está cerrada (corte hecho), (2) el pago es en efectivo y falta capturar «Efectivo recibido» o tocar «Exacto», (3) el ticket está vacío, (4) la propina escrita pasa del 100 %. Ver sección 6 (lista de revisión).
- «No puedo entrar a un módulo»: sale un candado 🔒 porque ese módulo es solo para administradores. Un administrador puede cambiar el rol en Ajustes → Equipo.
- «Cobré mal»: un administrador cancela el ticket (Comandas o Administración de pedidos) mientras el corte de ese día no esté hecho.
- «Se me olvidó registrar un día»: el sistema no permite registrar ventas ni cortes de fechas pasadas. Ver sección 18.1.

---

## 2. CÓMO ES LA PANTALLA

### Computadora y tablet en horizontal
- Menú lateral oscuro a la izquierda con los módulos a los que tu perfil tiene acceso. El módulo abierto va resaltado en verde. Abajo del menú se lee tu nombre y «Administrador · turno abierto» o «Empleado · caja cerrada» (según el estado de la caja de hoy).
- Arriba: la fecha del negocio, una insignia con tu perfil («Admin» o «Empleado») y tu foto de perfil, desde donde se cierra la sesión.
- Junto a algunos módulos aparece un número verde: significa que algo pide atención (comandas en curso, insumos por resurtir, lotes por vencer o cuentas nuevas pendientes de activar en Ajustes).

### Celular (pantalla chica)
- Barra inferior con lo más usado: Inicio, Venta y Comandas, y el botón «Más», que abre la lista de todos los módulos.
- **El perfil Empleado en celular ve únicamente «Venta» y «Comandas» en la barra inferior y no tiene el botón «Más».** Para entrar a Inventario o Productos, el empleado debe usar una pantalla grande (computadora o tablet horizontal), donde sí aparece el menú lateral.
- En el punto de venta, cuando hay productos en el ticket, aparece una barra oscura «🧾 Ticket · N artículos» con el total; al tocarla se abre el ticket completo con el botón de cobrar.

### Avisos que aparecen
- «Guardando» con un punto que late (arriba): se está enviando una acción al servidor. Espera a que desaparezca.
- Franja ámbar arriba: «La caja de hoy está cerrada: el cobro está pausado.» El administrador ve el enlace «Reabrir en Corte de caja»; el empleado ve «Pídele a un administrador que reabra el turno.»
- Mensajes emergentes abajo (por ejemplo «Venta #12 registrada»): confirman lo que pasó o avisan de un problema, y se van solos.
- Pantalla «Falta conectar un servicio»: falta configurar la base de datos o el inicio de sesión. No es algo que el equipo pueda arreglar; se avisa a quien instaló el sistema.
- Pantalla «Hubo un problema con la base de datos»: suele ser una actualización pendiente o llaves de otro proyecto. Se avisa a quien instaló el sistema; el botón «Volver a intentar» puede resolverlo si fue un fallo momentáneo.

### Actualización automática y sin conexión
- La información se refresca sola cada 15 segundos mientras la pestaña está a la vista, y después de cada acción. No hace falta recargar para ver lo que cobró la otra caja.
- **No existe modo sin conexión.** Todo lo que se hace viaja al servidor. Si el internet se cae, no se puede cobrar hasta que regrese. Nada queda guardado a medias en el dispositivo.
- Dos cajas pueden vender al mismo tiempo: ambas ven las mismas comandas y el mismo inventario.

---

## 3. PERFILES Y PERMISOS

### 3.1 Qué puede hacer cada perfil

| Módulo o acción | Empleado | Administrador |
| --- | --- | --- |
| Punto de venta (cobrar) | Sí | Sí |
| Comandas: ver y mover pedidos por los estados | Sí | Sí |
| Comandas: cancelar o borrar un ticket | No | Sí |
| Inventario: ver existencias, contar, recibir pedido, ajustar (+/−) | Sí | Sí |
| Inventario: crear insumos, borrarlos, editar sus datos y recetas | No | Sí |
| Productos: ver la carta, pausar o reactivar un producto | Sí | Sí |
| Productos: precios, recetas, categorías, leches, extras, fotos, crear y borrar | No | Sí |
| Productos preparados (caducidades) | No | Sí |
| Inicio (resumen del día) | No | Sí |
| Reportes e histórico de ventas, descargar CSV | No | Sí |
| Administración de pedidos (quitar renglones, borrar tickets) | No | Sí |
| Corte de caja (cerrar y reabrir) | No | Sí |
| Ajustes (negocio, módulos, equipo, logo) | No | Sí |
| Leer este manual en Inicio | Sí | Sí |

Notas:
- Un empleado que abre por su cuenta una pantalla de administración ve un candado 🔒 con el título «[Módulo] es solo para administración», el recordatorio de que su perfil es empleado con acceso a Punto de venta, Comandas, Inventario y Productos, y el botón «Ir al punto de venta». No es un error del sistema: es su perfil.
- Los empleados aterrizan en Inicio al entrar. Ahí ven el manual de instrucciones y debajo el candado «Inicio es solo para administración». Para trabajar van a Punto de venta o Comandas.
- Este rol lo cambia un administrador en **Ajustes → Equipo** (sección 9.6).

### 3.2 Cómo se obtiene el acceso
1. La persona inicia sesión con su correo desde la pantalla de acceso (o crea su cuenta con «Registrarse»).
2. La cuenta se registra sola, pero entra como **Empleado sin activar**.
3. Mientras no esté activada ve la pantalla «Un administrador debe autorizarte» (etiqueta «Cuenta en espera»): «Tu cuenta quedó registrada como [nombre], pero todavía no tiene acceso a la operación. Pídele a un administrador de TomoMatcha que te active desde Ajustes → Equipo.» Con los botones «Volver a intentar» y «Entrar con otra cuenta».
4. Un administrador entra a Ajustes → Equipo y pulsa «Activar» en esa cuenta (y, si hace falta, cambia el rol a Administrador).
5. La persona recarga la página y ya puede trabajar.

Esto es a propósito: crear una cuenta no debe alcanzar para entrar a la caja. Quien inicia sesión dice quién es; lo que puede hacer lo decide la lista del equipo.

El primer usuario que entró al sistema y los correos que quien instaló el sistema designó como administradores entran directo como administradores activos. Todos los demás quedan en espera.

### 3.3 Cerrar sesión
Se cierra desde la foto de perfil, arriba a la derecha.

---

## 4. PANTALLA «INICIO» — resumen del día [Solo administradores]

Es la pantalla de entrada. Arriba está siempre el **manual integrado** («Instrucciones»), que se abre con el botón «Abrir manual» y que ven administradores y empleados. Debajo, solo el administrador ve el resumen.

### 4.1 Qué muestra el resumen (de arriba a abajo)
1. **Saludo**: «Buenos días / Buenas tardes / Buenas noches, [nombre]» (según la hora del negocio: antes de las 12 días, antes de las 19 tardes, después noches) y el botón «Abrir punto de venta».
2. **Aviso de carta vacía** (solo si no hay productos): «Todavía no hay productos en la carta», con los botones «Crear productos» y «Cargar catálogo».
3. **Cuatro tarjetas de números** (la cuarta solo con Inventario encendido):
   - **Venta de hoy**: suma de lo cobrado hoy en tickets que no están cancelados, en cualquier estado de comanda. Incluye la propina y ya trae aplicados los descuentos. Debajo dice «Turno abierto» o «Caja cerrada».
   - **Tickets**: cuántos tickets se cobraron hoy (sin cancelados), con el «Ticket promedio» redondeado a pesos enteros.
   - **Piezas vendidas**: suma de las cantidades de todos los renglones vendidos hoy.
   - **Alertas de insumos**: cuántos insumos activos están en el mínimo o por debajo (dice «Revisar inventario» o «Todo abastecido»).
4. **En barra ahora**: las comandas en curso (Nuevo, En preparación o Listo) **de cualquier día**, las más antiguas primero, máximo 4, con «Ver tablero» hacia Comandas.
5. **Ventas · últimos 7 días**: siete barras, una por día operativo, con el total de cada día (sin cancelados, con propina). La de hoy va más oscura. Enlace «Ver reportes».
6. **Más vendidos**: hasta 5 productos por unidades. No es exactamente «hoy» ni «7 días»: usa las ventas cargadas en la aplicación (aproximadamente los últimos 9 días). Los productos que ya se borraron del menú se marcan «(fuera del menú)».
7. **Insumos por resurtir** (solo con Inventario encendido): hasta 5 insumos con «existencia / mínimo» y «y N más…».
8. **Preparados por vencer**: aparece solo si hay lotes que caducan hoy, mañana o ya caducaron; hasta 4 filas, con «Ver todos».
9. **Reseñas de Google** (solo si el módulo está encendido en Ajustes): muestra la calificación y el número de reseñas que se capturaron a mano en Ajustes.
10. **Últimos cortes**: los 3 cortes de caja más recientes con fecha, número de tickets y venta total del día.

### 4.2 Reglas que explican los números
- Los tickets cancelados **nunca** cuentan como venta.
- La propina **sí** está incluida en «Venta de hoy» y en los demás totales. Inicio no la muestra aparte (Reportes sí).
- «Hoy» cambia a la medianoche de la zona horaria del negocio, no del dispositivo.
- Nada en Inicio se edita: son resúmenes y enlaces a los módulos.
- Inicio no tiene selector de fechas. Para ver otros periodos: Reportes.

---

## 5. PUNTO DE VENTA — cobrar [Todos]

### 5.1 Pantalla
- Cabecera: «Caja abierta» o «Caja cerrada» y el título «Punto de venta».
- A la izquierda el catálogo: buscador «Buscar producto…» (busca en el nombre y en la descripción) y chips de categoría: «Todos» y las categorías del menú (solo aparecen las categorías activas que tienen algún producto activo).
- A la derecha (en pantalla grande) el **Ticket**. En celular el ticket se abre desde la barra inferior «🧾 Ticket · N artículos».
- Solo se muestran los productos activos. Si la carta está vacía aparece «La carta está vacía»: el administrador debe crear productos en Productos o cargar el catálogo sugerido desde Ajustes; el empleado debe pedírselo a un administrador.
- Si el corte de hoy ya se hizo aparece «Ventas en pausa: el corte de hoy ya se registró» (con «Ir a Corte de caja» para el administrador) y el botón de cobrar queda bloqueado.

### 5.2 Cobrar paso a paso
1. **¿Dónde se consume?** Elige «Para aquí» o «Para llevar». Ver 5.4: no es un detalle estético.
2. **Busca o filtra** el producto y tócalo. Se abre su ventana de personalización.
3. En la ventana, según lo que permita ese producto (solo aparece lo personalizable):
   - **Cantidad**: botones − y + (de 1 a 99).
   - **Leche**: una opción por cada leche disponible; las que tienen cargo extra lo muestran («Avena +$10»). Por omisión viene la primera leche disponible.
   - **Dulzor**: «Sin azúcar», 25 %, 50 %, 75 % o 100 %. Por omisión 50 %.
   - **Temperatura**: «Caliente 🔥» o «Frío 🧊». Por omisión caliente.
   - **Extras**: casillas con su precio («+$15»).
   - **Notas para barra**: texto libre de hasta 200 caracteres («Ej. sin popote, nombre para el vaso…»). Se ve en la comanda de la barra.
4. Pulsa **«Agregar · $X»**. El renglón entra al ticket.
5. Repite con los demás productos. Para **cambiar** un renglón tócalo en el ticket (el botón dice «Guardar · $X»). Para **quitarlo**, la ✕ a su derecha.
6. **Promoción** (opcional): «Sin promoción», «Descuento 10%» o «Cliente frecuente 15%». Son las únicas tres; no se puede escribir un descuento distinto.
7. **Propina**: «Sin propina» (viene así por omisión), 10 %, 15 %, 20 %, o escribe otro porcentaje en «Otro porcentaje (%)».
8. **Método de pago**: «Efectivo», «Tarjeta» y, solo si el módulo está encendido en Ajustes, «Mercado Pago».
9. Si es **Efectivo**: escribe en «Efectivo recibido» lo que entregó el cliente, o toca «Exacto», «$200» o «$500». El sistema muestra «Cambio: $X». Si lo recibido es menor que el total muestra «Faltan $X» en rojo y **no deja cobrar**.
10. Pulsa **«Cobrar $X»**. Aparece «Cobro completado» con «Venta #N registrada» y el total, con los botones «Nueva venta» y «Ver comanda».

### 5.3 Cómo se calcula el total
- **Precio de una línea** = precio del producto + cargo de la leche elegida + precio de cada extra, por la cantidad.
- **Subtotal** = suma de las líneas.
- **Descuento** = el porcentaje de la promoción aplicado sobre el subtotal. Da el **consumo**.
- **Propina** = el porcentaje elegido aplicado sobre el **consumo ya con descuento**. La promoción nunca le quita nada a la propina.
- **Total** = consumo + propina. Es lo que se cobra.
- La propina no puede pasar del 100 % del consumo. Si se escribe más, el sistema muestra «La propina no puede pasar del 100% del consumo.» y no deja cobrar.
- Los precios no se pueden editar en la caja. El servidor los vuelve a leer del menú al cobrar (precio del producto, cargo de la leche, precio de los extras). Para cambiar un precio hay que hacerlo en Productos (administrador).

### 5.4 Para aquí o para llevar (importa para el inventario)
- **Para llevar** descuenta, además de los ingredientes, el **empaque** (vasos, tapas, popotes, bolsas: los insumos marcados «Es empaque»).
- **Para aquí** no descuenta empaque: se sirve en loza. Con Inventario encendido y empaque registrado, el ticket lo recuerda con una línea: «Se descuentan vasos, tapas y demás empaque.» o «No se descuenta empaque: se sirve en loza.»
- La caja siempre arranca en «Para llevar» y **vuelve a «Para llevar» después de cada venta**. Es a propósito: si el cajero olvida cambiarlo, el sistema descuenta empaque de más y no de menos, que es el error más barato de corregir en el conteo.

### 5.5 Qué ocurre al cobrar (todo junto o nada)
1. Se crea el ticket con su folio consecutivo.
2. Aparece al instante como comanda «Nuevo» en el tablero de Comandas.
3. Con Inventario encendido, se descuentan los insumos según la receta de cada producto (incluida la leche elegida) y el empaque si es para llevar.
4. Se guarda la propina en su propio campo (no se mezcla con el consumo).
5. Se actualizan Inicio, Reportes y el Corte de caja.
6. Si algo falla en cualquier punto, **no queda nada**: ni la venta ni el descuento a medias. El cajero verá un aviso.

### 5.6 Cosas que la caja NO permite
- Editar el precio de un producto al vender, o cobrar un monto distinto del calculado.
- Escribir un descuento libre (solo los tres de la lista).
- Propina en pesos (solo en porcentaje, de 0 a 100 %).
- Pagar un mismo ticket con dos métodos distintos (cada ticket lleva un solo método).
- Vender un producto pausado o inactivo (no aparece en el catálogo).
- Cobrar con el corte del día ya hecho.
- Guardar un ticket «para después»: el ticket en armado vive en la pantalla. **Si sales de Punto de venta a otro módulo o recargas la página, el ticket en armado se pierde.** Termina el cobro antes de irte.
- Asignar un cliente de lealtad: esa opción está oculta en la versión actual del sistema.
- Cobrar sin internet.

### 5.7 Errores y avisos frecuentes al cobrar
- «Se perdió la conexión» justo al pulsar «Cobrar»: **la venta pudo registrarse igual.** Antes de cobrar de nuevo, revisa en Comandas si el pedido ya existe; el sistema no protege contra cobros duplicados (ver 18.11).
- «No se pudo guardar» con un motivo: lee el motivo; casi siempre se explica solo.
- «El corte de caja de hoy ya está cerrado»: hay que reabrir el turno en Corte de caja (administrador).
- «Mercado Pago está desactivado en Ajustes»: el módulo se apagó; elige otro método.
- «El producto "X" ya no está en el menú»: alguien lo pausó o borró mientras armabas el ticket. Quítalo del ticket.
- «Producto no encontrado en el ticket»: el producto ya no existe. Quítalo y vuelve a intentar.
- «El ticket está vacío»: agrega al menos un producto.
- «Demasiados renglones en un solo ticket»: el máximo es 60 renglones por ticket.
- Cantidad: mínimo 1, máximo 99 por renglón.

---

## 6. ¿POR QUÉ NO ME DEJA COBRAR? — lista de revisión

Revisar en este orden:
1. **¿Hay una franja ámbar arriba que dice «La caja de hoy está cerrada»?** El corte de hoy ya se registró. Un administrador debe entrar a Corte de caja y pulsar «Reabrir turno». (Después habrá que hacer el corte otra vez.)
2. **¿El ticket tiene productos?** Sin renglones el botón «Cobrar» está desactivado.
3. **¿El pago es en efectivo?** El botón se activa hasta que «Efectivo recibido» sea igual o mayor que el total. Toca «Exacto» si el cliente pagó justo. Si dice «Faltan $X» en rojo, falta dinero o falta capturar el monto.
4. **¿Escribiste un porcentaje de propina mayor a 100?** Corrige el porcentaje: el máximo es 100 %.
5. **¿Aparece «Guardando…» / «Cobrando…»?** Hay otra acción en proceso; espera a que termine.
6. **¿La lista de productos está vacía?** Faltan productos activos: administrador → Productos.
7. **¿Falló con un aviso?** Lee el aviso: normalmente dice el motivo (producto que ya no está en el menú, método de pago apagado…).
8. **¿No carga nada / se quedó cargando?** Puede no haber internet: sin conexión no se puede cobrar.

---

## 7. CORTE DE CAJA [Solo administradores]

Cierra el día: separa lo cobrado en efectivo de lo cobrado con tarjeta o pagos digitales y concilia el efectivo contra lo que hay físicamente. Mientras el corte esté cerrado, el punto de venta no cobra.

### 7.1 La pantalla
Cabecera: «Corte de caja». Tarjetas de resumen:
- **Venta total de hoy**: suma de todos los tickets de hoy no cancelados, con propina (dice cuánta propina incluye).
- **Efectivo esperado**: lo cobrado en **efectivo** hoy (incluye la propina cobrada en efectivo, porque físicamente está en el cajón). Dice «Incluye $X de propina» si hay.
- **Tarjeta** y **Mercado Pago** (si Mercado Pago está encendido) o una sola tarjeta «Tarjeta y otros» (si está apagado): cuánto se cobró con esos métodos.

En «Cierre de hoy»: **«Concilia el efectivo del turno»**, con «Efectivo esperado», la línea «Propina en efectivo» (cuánto de lo que hay en el cajón es propina) y, si en Ajustes se configuró un fondo de caja, «Fondo de caja: $X se quedan como fondo».

### 7.2 Cómo se hace el corte
1. Revisa «Efectivo esperado».
2. Cuenta el dinero del cajón.
3. Escribe la cifra en **«Efectivo contado»**. El sistema calcula al instante «Cuadra perfecto ✓», «Sobran $X» o «Faltan $X».
4. Opcional: escribe una explicación en «Notas del corte (opcional)» (hasta 400 caracteres).
5. Pulsa **«Confirmar corte del día»**.
6. Aparece el aviso «Corte registrado» con «La caja cuadró exacta.», «Sobraron $X en el cajón.» o «Faltaron $X en el cajón.»

A partir de ese momento el punto de venta queda en pausa.

### 7.3 Qué significa cada número (importante para contar bien)
- **Efectivo esperado** = suma de los totales de los tickets pagados en efectivo hoy que no están cancelados, **con propina incluida**.
- La **diferencia** que registra el sistema es: efectivo contado − efectivo esperado.
- **El fondo de caja NO se suma al efectivo esperado.** Es solo una referencia informativa. Por eso, para que la diferencia cuadre, el efectivo contado debe ser el dinero de las ventas del día, es decir, lo que hay en el cajón **sin** el fondo con el que abriste. Si cuentas todo el cajón incluyendo el fondo, saldrá un sobrante igual al fondo.
- **Tarjeta y Mercado Pago** se registran, pero el sistema no los procesa ni los cuenta contra el cajón: se concilian contra el estado de cuenta de la terminal o de Mercado Pago.
- **La propina** se guarda separada. Después del corte, el registro dice cuánta propina hubo en total y cuánta de esa fue en efectivo (la que se reparte del cajón).
- Los tickets cancelados no cuentan.

### 7.4 Corte ya hecho
La tarjeta cambia a «La caja ya está cerrada» con la insignia «Turno cerrado», quién lo cerró y a qué hora, y el resumen: efectivo esperado, efectivo contado, tarjeta y otros, propina del día (con la parte en efectivo) y la diferencia («Exacto ✓», «+$X» o «−$X»), más las notas.

### 7.5 Reabrir el turno
- Botón **«Reabrir turno»** → confirma con **«Sí, reabrir»** (advierte «Se borra el corte de hoy.»; la confirmación se cancela sola a los 6 segundos).
- Efecto: se **elimina el registro del corte de hoy** y el punto de venta vuelve a cobrar. Aviso: «Turno reabierto — El punto de venta puede volver a cobrar.»
- Cuando termines hay que **hacer el corte de nuevo**. El corte anterior no se conserva.
- Úsalo si el corte se hizo por error o si hay que cobrar algo más ese mismo día.

### 7.6 Historial
Abajo, «Cortes anteriores» lista los 12 más recientes: día, número de tickets, quién cerró, propina, esperado, contado y diferencia con sus notas. Si aún no hay: «Aún no hay cortes anteriores; el primero aparecerá aquí cuando cierres el día.»

### 7.7 Reglas y límites del corte
- **El corte siempre es del día de hoy** (día operativo del negocio). No hay forma de hacer o registrar el corte de un día anterior.
- Solo puede haber un corte por día: si intentas cerrar otra vez el mismo día el sistema dice «El corte de hoy ya fue registrado».
- Un día en el que nunca se hizo el corte se queda sin corte; no se puede completar después.
- Un ticket solo se puede cancelar, borrar o corregir mientras el corte de **su** día no exista. Con el corte hecho, esa venta queda cerrada (salvo que se reabra el turno de hoy, y eso solo aplica al día actual).
- El día se calcula con la zona horaria de Ajustes y es el **día calendario** (de las 00:00 a las 24:00 de esa zona). **No hay una hora de cierre configurable**: una venta hecha a las 00:30 cuenta para el día siguiente y no entra en el corte del día anterior. Si el corte «no cuadra con el día», revisa primero la zona horaria en Ajustes.
- Un día en el que nunca se hizo el corte no genera ningún aviso: el sistema no avisa de cortes pendientes.

---

## 8. REPORTES [Solo administradores]

Dos partes: un **panel rápido** de los últimos días y, debajo, el **Histórico de ventas** completo. No dependen de los módulos encendidos o apagados.

### 8.1 Panel rápido
- Selector **«Hoy»** / **«7 días»** (viene en «7 días»). Afecta a las cinco tarjetas, a «Métodos de pago» y a «Horas pico». **No** afecta a «Ventas por día» ni a «Top productos».
- Se calcula solo con las ventas que la aplicación tiene cargadas (aproximadamente los últimos 9 días). Para periodos más largos usa el Histórico.
- Tarjetas: **Ingresos** (con propina, ya con descuentos), **Tickets** (sin cancelados), **Ticket promedio** (Ingresos ÷ Tickets, en pesos enteros), **Piezas**, **Propina** (incluida en Ingresos; es dinero del equipo, no margen).
- **Ventas por día · últimos 7 días**: barras con el total de cada día.
- **Top productos**: hasta 8 por unidades, sobre todo lo cargado. Su importe es a precio de lista, sin descuentos del ticket ni propina; por eso puede no coincidir con Ingresos. «(fuera del menú)» marca productos que ya se borraron.
- **Métodos de pago**: gráfica de dona con el porcentaje de Efectivo, Tarjeta y Mercado Pago (Mercado Pago aparece siempre en Reportes aunque esté apagado en Ajustes).
- **Horas pico**: cuántos tickets por hora, de las 7:00 a las 22:59 (los tickets de 23:00 a 6:59 no aparecen en esa gráfica).
- Si no hay ninguna venta en lo cargado: «Sin ventas en los últimos días» (el histórico de abajo sigue disponible).

### 8.2 Histórico de ventas
Consulta todas las ventas desde la primera que se cobró, sin límite de días. Los días se cuentan en la zona horaria del negocio (la misma del corte), así que las cifras cuadran con el corte.

**Filtros:**
- Atajos: «7 días», «30 días», «Este mes», «Este año», «Todo». Viene en «30 días».
- «Desde» y «Hasta»: fechas a la medida (aparece la insignia «Rango a la medida»). Vaciar una la deja abierta.
- «Agrupar por»: Día, Semana, Mes o Año. Las semanas son de lunes a domingo.
- «Método de pago»: Todos, Efectivo, Tarjeta o Mercado Pago (filtra todo).
- Casilla «Mostrar tickets anulados en la lista»: solo afecta a la lista de tickets; los resúmenes siempre cuentan las anulaciones por separado y nunca les suman dinero.

**Seis tarjetas de resumen** (sobre todo el rango elegido, no solo la página que se ve): Ingresos (con propina), Tickets (dice cuántos anulados), Ticket promedio, Piezas, Propinas y Descuentos («Lo que no se cobró»: lo que el consumo costaba a precio de lista menos lo que se cobró).

**Tabla «Ventas por [día/semana/mes/año]»**: columnas Periodo, Tickets, Piezas, Propina y Total. Solo aparecen periodos con tickets. Al **tocar un periodo** se abre su detalle: el año enseña sus meses, el mes sus días, la semana sus días.

**Top productos** del rango (hasta 15) y **Métodos de pago** del rango.

**Tickets**: lista con los más recientes primero, 50 por página («Anteriores» / «Siguientes»). Cada fila: folio, fecha y hora, piezas y método, cliente y quién cobró si aplica; los anulados llevan la insignia «Anulado» y el importe tachado. Al abrir un ticket se ven sus renglones y una línea con consumo, descuento, propina y «Para aquí/Para llevar». El detalle **no** muestra leche, dulzor, temperatura, extras ni notas.

### 8.3 Descargar CSV
Botón **«Descargar CSV»** (dice «Preparando…» mientras trabaja). Descarga los tickets del rango y método elegidos, **hasta 5 000, los más recientes** (si el rango tiene más, se descargan los 5 000 más recientes y el aviso lo dice). No depende de la página que se ve ni de «Agrupar por». El archivo se llama `ventas-[desde]-a-[hasta].csv`, se abre bien en Excel con acentos, y trae 14 columnas: Folio, Fecha, Hora, Estado, Pago, Servicio, Piezas, Subtotal, Descuento, Propina, Total, Cliente, Cobró y Productos. Los anulados salen solo si la casilla «Mostrar tickets anulados en la lista» está marcada, y la columna Estado dice `cancelado`.

### 8.4 Errores del histórico
- «No se pudo consultar el histórico. Revisa la conexión.»: internet.
- «La fecha inicial es posterior a la final. Revisa el rango.»: corrige las fechas.
- «El histórico de ventas todavía no está disponible: falta una actualización de la base de datos. Pídesela a quien instaló la aplicación.»: es técnico.

### 8.5 Lo que Reportes no hace
No modifica ni cancela tickets (eso es Administración de pedidos), no exporta a PDF ni a Excel nativo (solo CSV de tickets), no compara periodos, no filtra por producto, categoría o cajero, y no separa las propinas por método de pago.

---

## 9. AJUSTES [Solo administradores]

Botones y secciones, de arriba abajo. Si hay cuentas esperando, arriba aparece «N cuenta(s) esperando autorización»: se activan en «Equipo».

### 9.1 Datos del negocio / Identidad y operación
- **Sucursal**: nombre de la sucursal (hasta 120 caracteres, obligatorio).
- **Zona horaria**: define el día operativo, de lo que depende el corte de caja. Opciones: America/Mexico_City, America/Tijuana, America/Monterrey, America/Cancun, America/Hermosillo, America/Bogota, America/Lima, America/Santiago, America/Argentina/Buenos_Aires y Europe/Madrid.
- **Fondo de caja**: informativo en el corte (de 0 a 1 000 000). Vacío se guarda como 0.
- **Reseñas de Google**: «Enlace para dejar reseña» (debe empezar con http:// o https://), «Calificación actual» (de 0 a 5, opcional) y «Número de reseñas» (opcional). Se capturan a mano.
- Botón **«Guardar ajustes»**: valida todos los campos a la vez; si uno falla no se guarda ninguno. Aviso «Ajustes guardados».

Lo que **no** se puede cambiar desde la pantalla: el nombre del negocio y la moneda.

Detalle: el formulario de Ajustes se carga una vez al abrir la pantalla. Si otro administrador cambia ajustes mientras lo tienes abierto, no se actualiza solo; recarga la página antes de guardar para no pisar sus cambios.

### 9.2 Logo del negocio
Botón «Subir logo» / «Cambiar logo» y «Quitar» (sin confirmación). Máximo 25 MB por imagen. El logo solo se muestra en esta tarjeta de Ajustes. Si el servicio de imágenes no está configurado, en lugar del botón dice «Para subir imágenes falta configurar…»; eso lo resuelve quien instaló el sistema.

### 9.3 Módulos (interruptores)
Se aplican al instante al tocarlos (no hay botón de guardar) y **cambian el comportamiento real** del sistema, no solo lo que se ve. Aviso: «Módulo actualizado».
- **Inventario de insumos**: apagado, las ventas dejan de descontar existencias; el módulo Inventario muestra «Inventario está desactivado»; Inicio oculta las alertas de insumos; el POS deja de recordar el empaque.
- **Reseñas de Google**: muestra u oculta la tarjeta de calificación en Inicio.
- **Pagos con Mercado Pago**: agrega o quita ese método en la caja. El registro es manual: el sistema no procesa el pago, solo lo contabiliza.
- (El módulo «Lealtad y clientes» existe pero está oculto en la versión actual; ver sección 15.)

Ojo: apagar Inventario no borra nada; las ventas hechas con el módulo apagado simplemente no descontaron insumos, y al encenderlo de nuevo no se recalculan. Piénsalo antes de mover un interruptor a media operación.

### 9.4 Catálogo inicial sugerido
Solo aparece cuando la carta está **vacía**. Botón **«Cargar catálogo inicial»**: carga la carta base de TomoMatcha (22 productos, 26 insumos con sus recetas, 5 leches, 5 extras y 4 categorías: Matcha, Café, Té e infusiones y Bakery). Todo queda editable; las existencias arrancan en **cero** porque el inventario real se cuenta, no se adivina. Después, la tarjeta «Catálogo» solo muestra el resumen (cuántos productos e insumos hay y la fecha en que se cargó). Si ya hay productos, no se puede volver a cargar («Ya hay productos en la carta. El catálogo inicial sólo se puede cargar cuando está vacía.»).

### 9.5 Conexiones
Tarjeta informativa con el estado del servicio de imágenes («Conectado» / «Pendiente»). Sin ese servicio todo funciona igual, solo no se pueden subir fotos de productos ni el logo.

### 9.6 Equipo — quién puede entrar
Lista con las cuentas: primero las pendientes, luego las activas. En cada fila: nombre, insignias («Tú», «Pendiente»), correo, selector de rol (Administrador / Empleado) y botones.
- **Activar**: da acceso a una cuenta pendiente. Aviso «Cuenta activada».
- **Desactivar** (con confirmación «Sí»): la persona deja de entrar; su historial de ventas se conserva. Aviso «Cuenta desactivada».
- **Rol**: cambia entre Administrador y Empleado.
- **Quitar** (confirmación «Sí, quitar»): elimina a la persona de la lista del equipo y **no se puede deshacer**. Sus ventas y cortes se conservan con su nombre. Si esa persona vuelve a iniciar sesión, queda de nuevo como empleado en espera de activación.
- Reglas: **no puedes cambiar tu propio rol, ni desactivarte, ni quitarte**. Si necesitas cambiar tu rol, otro administrador debe hacerlo («No puedes cambiar tu propio rol. Pídele a otro administrador que lo haga.»). El sistema exige que quede al menos un administrador activo.
- No se pueden invitar ni crear personas desde la aplicación: cada quien crea su cuenta iniciando sesión, y luego se activa aquí. El nombre y el correo vienen de la cuenta de inicio de sesión y no se editan en la aplicación.

---

## 10. COMANDAS — el tablero de la barra [Todos]

Cada venta cobrada llega aquí como una tarjeta. El tablero tiene cuatro columnas y el pedido avanza de izquierda a derecha.

### 10.1 Pantalla
- Cabecera: «Barra · flujo de pedidos» y el título «Comandas». Botones: «Pantalla completa» y «+ Nueva venta» (lleva al Punto de venta, que con la caja cerrada no deja cobrar).
- Si no hay pedidos activos aparece «La barra está al día» con el botón «Abrir punto de venta».
- Columnas y sus textos vacíos: **Nuevo** («Cobra en el punto de venta para ver pedidos aquí.»), **En preparación** («Sin pedidos en preparación.»), **Listo** («Sin pedidos listos por entregar.») y **Entregado** («Aún no hay entregas hoy.»). Cada una lleva un contador.
- Las tres primeras ordenan de la más antigua a la más nueva. **Entregado** va de la más reciente a la más antigua, muestra máximo 6 y avisa «+N entregadas hoy» si hay más.

### 10.2 La tarjeta de un pedido
- Arriba: el folio (#12) y la hora en que se cobró.
- A la derecha: «hace N min» mientras no esté entregado. **Menos de 6 minutos** se ve normal, **desde 6** en ámbar, **desde 10** en rojo y toda la tarjeta se tiñe de rojo. Al entregarse muestra «✔ HH:MM».
- El contador corre desde que se cobró; **no se reinicia** al cambiar de estado. Se recalcula con cada actualización de pantalla (cada ~15 segundos), no cada segundo.
- Etiqueta de servicio: «🍽️ Para aquí» o «🥤 Para llevar».
- Renglones: cantidad × producto, y debajo la leche, «Sin azúcar» o «N% dulzor», «Caliente» o «Frío» y los extras. Las notas del cajero salen en cursiva con 📝.
- Pie: total; si hubo propina, «incluye $X de propina»; el método de pago.

### 10.3 Cómo avanza un pedido
1. **Nuevo** → botón **«Empezar preparación»**.
2. **En preparación** → botón **«Marcar listo»**.
3. **Listo** → botón **«Entregar»**.
4. **Entregado**: termina el flujo. No tiene botones.

- El botón **←** regresa el pedido al estado anterior si te adelantaste (no aparece en Nuevo). Desde **Entregado no se puede regresar** con los botones.
- Cualquier cuenta activa (empleado o administrador) puede mover pedidos. No pide confirmación ni muestra aviso.
- Mover un pedido **no cambia dinero ni inventario**: los estados son de la barra, no de la caja.
- Se puede seguir moviendo comandas aunque el corte del día ya esté hecho.
- Cuidado con dos dispositivos a la vez: el sistema recibe «avanzar» o «regresar», no «pasar a tal estado». Si dos personas pulsan al mismo tiempo, el pedido puede avanzar dos estados.
- Un pedido abierto **no se cierra solo**: se queda en su columna hasta que alguien lo mueva o un administrador lo cancele. Los pedidos abiertos de días anteriores siguen apareciendo, con un «hace N min» enorme y en rojo.

### 10.4 Controles de administrador en la tarjeta
- **«Cancelar ticket»** → «Se devuelven insumos y puntos.» → **«Sí, cancelar»** (o «Cancelar» para arrepentirse). Ver sección 11.
- **«Borrar ticket»** → «Desaparece del histórico y de los reportes. No se puede deshacer.» → **«Sí, borrar»**.
- Las confirmaciones se desarman solas a los 6 segundos.
- Solo administradores ven estos botones.

### 10.5 Tickets cancelados
Debajo del tablero, si hay cancelados **de hoy**, aparece «N ticket(s) cancelado(s) hoy» que se despliega con el folio, la hora y el total tachado (y «Borrar» para administradores). Un cancelado de un día anterior ya no sale en Comandas; se ve en Administración de pedidos (etiqueta «Cancelado») y en Reportes (etiqueta «Anulado»).

### 10.6 Pantalla completa
«Pantalla completa» pone solo el tablero a pantalla completa, pensado para una tablet fija en la barra.
- En ese modo **no se ven** el menú, la cabecera ni los avisos emergentes; solo el tablero.
- Se sale con la tecla **Esc** o con el gesto del navegador.
- Depende de que el navegador permita pantalla completa; en algunos dispositivos (por ejemplo el iPhone) puede no funcionar.

### 10.7 Qué se ve de días anteriores
Comandas carga los últimos ~9 días de ventas más todos los pedidos abiertos de cualquier fecha. La columna Entregado solo muestra lo entregado de **hoy**.

---

## 11. ADMINISTRACIÓN DE PEDIDOS — corregir y borrar [Solo administradores]

Ruta «Administración de pedidos». Encabezado: «Solo administración». Sirve para corregir capturas: quitar un producto suelto de un ticket o borrar el ticket completo.

### 11.1 Qué muestra
- Un único filtro, el botón **«Solo hoy»** (con ✓ cuando está activo). Sin buscador ni filtro por fecha.
- Lista de tickets de la ventana cargada (últimos ~9 días más abiertos de cualquier día), del más nuevo al más antiguo. **Un ticket de hace más de 9 días no se puede cancelar, borrar ni editar desde ninguna pantalla**; solo se puede ver en el histórico de Reportes.
- Tarjetas: «Tickets», «Productos» (suma unidades e incluye cancelados aunque diga «Renglones cobrados») e «Importe» (sin contar cancelados).
- Cada ticket: folio, hora y fecha, número de productos, método de pago y quién cobró; el estado («Nuevo», «En preparación», «Listo», «Entregado» o «Cancelado»); y el botón «Borrar ticket». Al desplegarlo se ven sus renglones con «Quitar».

### 11.2 Tres acciones que NO son lo mismo

| | Cancelar ticket | Quitar un renglón | Borrar ticket |
| --- | --- | --- | --- |
| Dónde | Comandas | Administración de pedidos | Comandas y Administración de pedidos |
| Qué pasa con la venta | Se **conserva** marcada como cancelada («Anulado» en Reportes) | Sigue existiendo sin ese producto | **Desaparece** de la base y de los reportes |
| Insumos | Se devuelven | Se devuelven los de ese producto | Se devuelven (si no estaba cancelado) |
| Dinero | Ya no suma en ninguna cifra | Se recalculan subtotal y total | Deja de existir |
| Folio | Se conserva (explica un hueco) | Igual | **Queda un hueco** en los folios; no se reutiliza |
| Se puede deshacer | No | No | No |
| Cuándo usarlo | El día a día: la venta ocurrió pero se cobró mal | Sobra un producto del ticket | Solo para limpiar datos de prueba |

**Regla de oro:** si dudas entre cancelar y borrar, **cancela**: conserva la información y devuelve los insumos igual.

### 11.3 Cancelar un ticket
- En Comandas: «Cancelar ticket» → «Sí, cancelar». Aviso: «Ticket #N cancelado — Se devolvieron los insumos y los puntos.»
- Devuelve al inventario los insumos que esa venta descontó (lo mismo que se registró al cobrar). Si el módulo Inventario estaba apagado cuando se vendió, no había nada que devolver.
- La venta se queda con su folio, sus renglones y su total, pero **ninguna suma la cuenta**: ni Inicio, ni Reportes, ni el corte.
- Funciona con tickets ya entregados.
- **No se puede deshacer** ni reactivar; un ticket cancelado ya no se mueve («Un ticket cancelado ya no se mueve.»).
- Errores: «El ticket #N ya estaba cancelado» y **«El corte del día de este ticket ya se cerró; cancelarlo descuadraría la caja»**.

### 11.4 Quitar un renglón
- En Administración de pedidos: despliega el ticket → «Quitar» junto al producto → «Se devuelven sus insumos y se recalcula el ticket.» → **«Sí, quitar»**. Aviso: «Producto quitado del ticket».
- Recalcula subtotal y total con el descuento del ticket. **La propina se conserva** tal como la dejó el cliente y solo se recorta si el consumo baja por debajo de ella. Si hay una nota «Incluye $X de propina, que se conserva al quitar productos.»
- Devuelve los insumos de ese producto según la receta actual, respetando si el pedido era para aquí (no devuelve empaque) y la leche elegida.
- **El último renglón no se puede quitar**: sale «Es el único producto del ticket; borra el ticket completo». Un renglón con cantidad 3 cuenta como un solo renglón.
- Si el ticket tiene un solo renglón, en lugar de «Quitar» dice «Único producto».

### 11.5 Borrar un ticket
- «Borrar ticket» → «Desaparece del histórico. No se puede deshacer.» → **«Sí, borrar»**. Aviso «Ticket #N borrado».
- Primero devuelve insumos y retira puntos (si no estaba cancelado) y después elimina la venta con su bitácora. Un ticket ya cancelado también se puede borrar.
- El folio no se reutiliza.
- Solo administradores. Existe para limpiar pruebas.

### 11.6 Regla del corte cerrado (aplica a las tres acciones)
Cancelar, quitar renglones y borrar están **bloqueados si el día de ese ticket ya tiene corte de caja**. Los errores dicen «El corte del día de este ticket ya se cerró; …». En la pantalla se ve el aviso rojo «El corte de este día ya se cerró: el ticket ya no se puede modificar.» (los botones no se desactivan; el servidor es el que rechaza).
- Para tocar un ticket de **hoy** después de cerrar: Corte de caja → «Reabrir turno», hacer la corrección y cerrar de nuevo.
- Para tocar un ticket de un día anterior con corte hecho: **no hay forma** en el sistema.
- Un día anterior en el que **nunca** se hizo el corte no está bloqueado: sus tickets se pueden cancelar (un administrador, y siempre que estén dentro de los últimos ~9 días).

### 11.7 Qué se puede corregir y qué no en un ticket ya cobrado
- **No se puede editar** en un ticket cobrado: el método de pago, la propina, «Para aquí/Para llevar», el descuento, el cliente, la fecha y hora, el folio, el efectivo recibido, las cantidades, la leche, el dulzor, la temperatura, los extras ni las notas. Tampoco se pueden **agregar** productos a un ticket ya cobrado.
- **Lo que sí se puede hacer**: mover el estado (cualquier cuenta), y (solo administradores, con el corte del día sin hacer) cancelar, quitar un renglón o borrar.
- **Cómo se corrige un cobro equivocado** (método de pago, propina, modo de servicio, descuento): un administrador **cancela** el ticket y se **vuelve a cobrar** correctamente en el Punto de venta. La venta nueva tendrá otro folio y la hora actual. Solo funciona si el corte del día del ticket original no se ha hecho.
- **Si faltó un producto** en un ticket ya cobrado: cobra aparte un ticket nuevo con lo que faltó.
- Los precios de los tickets viejos **no cambian** si después se cambia el precio, el nombre o se borra el producto: cada ticket guarda su propia copia (nombre, precio, foto, leche y extras con su precio).

---

## 12. INVENTARIO DE INSUMOS [Todos, con limitaciones para empleados]

Aquí viven las existencias: matcha, leches, jarabes, vasos, bakery. No se capturan a mano cada día: cada venta descuenta sola lo que dice la receta del producto (si el módulo está encendido). Lo que sí se registra a mano es lo que **entra** (mercancía), lo que se **tira** (merma) y el **conteo físico**.

### 12.1 Quién puede qué
| Acción | Empleado | Administrador |
| --- | --- | --- |
| Ver lista, buscar, filtrar | Sí | Sí |
| Botones − y + | Sí | Sí |
| «Recibir pedido» | Sí | Sí |
| «Contar» (conteo físico) | Sí | Sí |
| «+ Nuevo insumo», «Editar», «Eliminar» | No | Sí |
| Editar el consumo de un insumo por producto (recetas) | No | Sí |

Si Inventario está apagado en Ajustes, la pantalla dice «Inventario está desactivado» y las ventas dejan de descontar existencias.

### 12.2 Pantalla
- Cabecera «Insumos · descuento por receta» / «Inventario». Botón «+ Nuevo insumo» (solo administrador).
- Tarjetas: «Insumos registrados», «En alerta» (los que están en el umbral o por debajo), «Empaque» y «Próximo a agotarse» (el insumo con menor existencia respecto a su umbral).
- Buscador «Buscar insumo…» (por nombre; distingue acentos: «cafe» no encuentra «café») y filtros **Todos**, **En alerta** y **Correctos**.
- Orden fijo: primero los que están en alerta (los más urgentes arriba) y luego el resto por nombre.
- Cada fila muestra: nombre; etiqueta de nivel; «Empaque» si aplica; «Umbral: X (N% del objetivo) · Uso semanal: Y»; cuántos productos lo usan; una barra de nivel; la existencia actual; los botones − y +, «Recibir pedido» y «Contar»; y (administrador) «Editar» y «Eliminar».
- Etiquetas de nivel: **«Crítico»** (rojo): existencia a la mitad del umbral o menos; **«Resurtir»** (ámbar): en el umbral o por debajo; **«En orden»** (verde): lo demás.

### 12.3 Los cuatro movimientos y en qué se diferencian (lo que más se confunde)
- **Botones − y +**: ajustes rápidos de una cantidad fija: **25 g**, **250 ml** o **1 pieza** según la unidad. El **−** se registra como **merma** (algo que se tiró o perdió) y el **+** como **entrada**. No muestran aviso al hacerlo. El **−** se desactiva cuando la existencia ya es 0.
- **«Recibir pedido»**: **suma** lo que llegó a lo que ya había. Recibir 200 vasos deja 200 vasos **más** de los que tenías. Se escribe en «Cantidad recibida (unidad)», muestra «Quedará en …» y se confirma con «Registrar entrada». Aviso: «Entrada registrada».
- **«Contar»** (título «Conteo físico»): **reemplaza** el total por lo que contaste. Si cuentas 200 vasos quedan 200 exactos, sin importar lo que decía el sistema. Es la forma de volver a cuadrar. Se escribe en «Cantidad contada (unidad)» y se confirma con «Guardar conteo». Aviso: «Conteo registrado». La diferencia contra lo que decía el sistema queda registrada como ajuste.
- **Venta**: descuenta sola según la receta.

Recibir y contar son dos botones distintos justo porque se confunden: recibir 200 vasos **no** es lo mismo que quedarse con 200.

### 12.4 Crear o editar un insumo [Solo administradores]
Campos: **Nombre** (obligatorio, máx. 120); **Unidad** (g gramos, ml mililitros o pza piezas); **Nivel objetivo** (opcional: cuánto tienes cuando está bien surtido); **Umbral de alerta** (debajo de esa cantidad se marca por resurtir); **Uso semanal** (referencia, opcional); **Existencia inicial** (solo al crear; lo que hay ahora en la barra, cuéntalo, no lo adivines); y el interruptor **«Es empaque»** (vasos, tapas, servilletas, popotes: solo se descuentan en pedidos «para llevar»).
- Si capturas un Nivel objetivo, aparecen los atajos **«Avisar al 25%»**, **«Avisar al 50%»** y **«Avisar al 75%»**, que calculan el umbral solos.
- Avisos: «Insumo agregado» / «Insumo actualizado».
- Al **editar** no hay campo de existencia: la existencia solo cambia con −/+, «Recibir pedido» y «Contar».
- Cambiar la **unidad** de un insumo ya en uso no convierte la existencia ni las recetas: revisa los números.
- No puede haber dos insumos con el mismo nombre (sin importar mayúsculas).

### 12.5 Panel de consumo — «cuánto gasta cada producto» [Solo administradores]
En la fila, «Lo usan N productos · editar consumo» abre «Consumo de [insumo]»:
- Lista los productos que usan ese insumo, con la cantidad; se cambia y se pulsa **«Guardar»** (aviso «Receta actualizada»). «Quitar» → «Sí» saca el insumo de esa receta.
- «Agregar a la receta de otro producto»: eliges «Producto», escribes «Cantidad» y pulsas «Agregar».
- Las **leches** aparecen en el panel de su propio insumo aunque la receta las lleve como «leche elegida por el cliente». Esa cantidad es la misma para cualquier leche que elija el cliente, así que cambiarla ahí la cambia para todas.
- Las dos vistas (aquí y en Productos) escriben en la misma receta.
- Limitación: el conteo «Lo usan N productos» y este panel no consideran los **extras**: un insumo usado solo por un extra dice «Ningún producto lo consume todavía».

### 12.6 Eliminar un insumo [Solo administradores]
- «Eliminar» → «Sí, eliminar». Aviso «Insumo eliminado».
- **Se rechaza** si alguna receta (de un producto o de un extra) lo usa: «Este insumo se usa en N receta(s). Quítalo de ahí antes de eliminarlo.»
- Si no lo usa ninguna receta se borra, **con todo su historial de movimientos, y no se puede deshacer**.
- Si una leche estaba ligada a ese insumo, la leche pasa a «No descuenta inventario» sin avisar.
- No hay forma de archivar o desactivar un insumo; solo borrarlo.

### 12.7 Cuándo avisa el sistema
- Por debajo del umbral: «Resurtir»; a la mitad del umbral: «Crítico».
- Los insumos en alerta suman en el número verde junto a Inventario y aparecen en Inicio («Alertas de insumos» e «Insumos por resurtir»).
- Un insumo nuevo con umbral 0 y existencia 0 aparece en el filtro «En alerta» pero con la etiqueta «En orden» (con umbral 0 la etiqueta no marca nada). Ponle un umbral.

### 12.8 Cosas que hay que saber
- **La existencia nunca baja de 0.** Si la venta necesita más de lo que hay, el sistema deja 0.
- **Una venta nunca se bloquea por falta de insumos.** Un producto con existencia 0 se sigue vendiendo. Nada lo pausa solo.
- Como la existencia se queda en 0 pero el movimiento guarda el consumo completo, **cancelar o borrar un ticket después de haber llegado a 0 puede devolver más de lo que realmente se había descontado**, y **quitar un renglón y después cancelar el ticket completo puede devolver dos veces los insumos de ese renglón**. Es un comportamiento actual del sistema: cuando la existencia no cuadre, haz un **«Contar»** para dejar la cifra real.
- Apagar Inventario en Ajustes hace que las ventas no descuenten y que las cancelaciones no devuelvan nada de esas ventas.
- Todos los movimientos (venta, entrada, merma, ajuste, cancelación) quedan **registrados** en la base, pero **hoy no hay una pantalla para consultar esa bitácora**. Tampoco se pueden anotar comentarios en los movimientos desde la aplicación.
- No hay importación ni exportación de inventario, ni proveedores, costos ni órdenes de compra.
- Con **empaque**: un pedido «Para aquí» no descuenta vasos ni tapas; uno «Para llevar» sí.
- **Leche**: el descuento sale de la leche que el cliente elige en la caja. Si esa leche no tiene insumo ligado, no descuenta nada. La cantidad de leche es la de la receta del producto (ml).

---

## 13. PRODUCTOS PREPARADOS — lotes hechos en casa y caducidades [Solo administradores]

Para mermeladas, jarabes, roles, pasteles y todo lo que se elabora en casa. Cada lote tiene fecha de elaboración y de caducidad; el sistema cuenta los días. **No descuenta inventario ni se vende desde el punto de venta**: es un control aparte, solo de caducidades. Módulo «Productos preparados» (lo ve solo el administrador; el empleado ve el candado). No depende de ningún módulo encendido o apagado.

### 13.1 Registrar un lote
1. Pulsa **«+ Nuevo lote»**.
2. **Producto** (nombre, máx. 120), **Cantidad** y **Unidad** (g, ml o pza; por omisión pza).
3. **Se elaboró** (por omisión, hoy) y **Caduca** (por omisión, hoy + 5 días). De «Caduca» sale la cuenta regresiva y el formulario muestra en vivo «Faltan N días». La caducidad no puede ser anterior a la elaboración.
4. **Notas** opcionales (lote, tanda, dónde está guardado; máx. 400).
5. **«Registrar lote»**. Aviso «Lote registrado».

### 13.2 Estados y avisos
| Días que faltan | Etiqueta | Color |
| --- | --- | --- |
| 4 o más | «En buen estado» | verde |
| 2 o 3 | «Por vencer» | ámbar |
| 0 o 1 (hoy o mañana) | «Último día» | rojo |
| Ya pasó | «Caducado» | rojo |

- La lista va ordenada por lo que vence primero, con la cuenta regresiva grande: «Faltan N días», «Caduca mañana», «Caduca hoy» o «Caducó hace N día(s)».
- Tarjetas: «Lotes activos», «Críticos» (último día o caducado), «Sin atender» y «Próximo a vencer». Filtros: Todos, Críticos y En buen estado.
- Arriba aparece una tarjeta roja «N lote(s) necesita(n) tu atención» cuando hay lotes críticos que nadie ha revisado. **Ese aviso no desaparece solo.**

### 13.3 Botones de cada lote
- **«Ya lo revisé»** (solo si el lote es crítico y no está revisado): marca el aviso como atendido. Aviso «Alerta atendida». Queda una etiqueta gris «Revisado». Es por lote y permanente: si después pasa de «Último día» a «Caducado» no vuelve a avisar.
- **«Editar»**: cambia los datos. **Cualquier edición reinicia el «Ya lo revisé»** (aunque solo cambies las notas), y si el lote sigue crítico el aviso regresa.
- **«Desechar»** → «Sí, desechar»: retira el lote de la lista (aviso «Lote desechado»). **No se puede deshacer** y no hay pantalla de lotes desechados.

### 13.4 Dónde más se ve
El número verde junto a «Productos preparados» (lotes de hoy, mañana o caducados sin revisar) y, en Inicio, «Preparados por vencer». No hay correo ni notificaciones fuera de la aplicación.

### 13.5 Límites
Sin buscador ni paginación (se muestran los 200 lotes con caducidad más próxima); los umbrales de 0, 1 y 3 días son fijos y no se configuran.

---

## 14. PRODUCTOS — la carta, recetas y opciones [Todos, con limitaciones para empleados]

El menú vive aquí y se edita sin depender de nadie.

### 14.1 Quién puede qué
| Acción | Empleado | Administrador |
| --- | --- | --- |
| Ver la carta y las recetas | Sí | Sí |
| Interruptor ON/OFF de cada producto (pausar / reactivar) | Sí | Sí |
| Crear producto, editar, cambiar precio, recetas, personalización, fotos, borrar | No | Sí |
| Categorías, Leches y Extras | No (no aparecen) | Sí |

El empleado ve el texto «Consulta la carta y quita del menú lo que se haya acabado. Precios, recetas y altas las lleva administración.»

### 14.2 La pantalla
- Cabecera «Menú · sin tocar código» / «Productos» y, para el administrador, «+ Nuevo producto».
- Tarjetas: «En el menú» (activos), «Pausados», «Categorías» y «Precio promedio» (de los activos).
- Chips de categorías (con «oculta» las apagadas). Sin chips de conteo.
- Cada producto: foto o emoji, nombre, insignias («Popular», «Fuera del menú» si está pausado, «Sin receta» si no tiene receta y Inventario está encendido), descripción, precio (el administrador lo edita tocándolo) y el **interruptor** de disponibilidad. «Receta y opciones ▾» despliega la receta y, para el administrador, «Personalización», fotos, «Editar producto» y «Eliminar producto».

### 14.3 Pausar o reactivar un producto [Todos]
El interruptor ON/OFF de la tarjeta saca el producto de la caja **al instante**, sin borrarlo. Es lo que se hace cuando se acaba un insumo. Un producto pausado no aparece en el Punto de venta; si alguien lo tenía ya en un ticket a medio armar, al cobrar sale «El producto "X" ya no está en el menú». No se pausa solo cuando se acaba el insumo.

### 14.4 Cambiar un precio [Solo administradores]
Toca el precio en la tarjeta, escribe el nuevo y pulsa Enter (o toca fuera para guardar; **Esc cancela**). Aviso «Precio actualizado». Si el campo queda vacío o igual, no hace nada y no avisa. Rango: 0 a 100 000. Los tickets ya cobrados **no cambian**.

### 14.5 Crear o editar un producto [Solo administradores]
Formulario «Nuevo producto» / «Editar producto»:
1. **Nombre** (obligatorio, máx. 120; no puede repetirse: «Ya existe un producto con ese nombre.»).
2. **Emoji** (se usa si no hay foto).
3. **Foto del producto** (opcional; JPG, PNG o WebP, hasta 25 MB). Solo funciona si el servicio de imágenes está configurado; si no, el formulario lo dice y se usa el emoji. La foto se sube **después** de guardar el producto; si la subida falla, el producto queda guardado sin foto.
4. **Categoría**.
5. **Precio** en la moneda del negocio.
6. **Descripción** (aparece en el punto de venta; máx. 300).
7. Interruptores **«Activo en el menú»** y **«Marcar como popular»** (la insignia «Popular» es solo visual: no cambia el orden).
8. **«Personalización permitida»**: **Leche**, **Dulzor**, **Temperatura**, **Extras**. Solo aparece en la caja lo que el producto permita.
9. **Receta · lo que descuenta cada venta**: filas de insumo + cantidad. La primera opción de la lista es **«Leche elegida por el cliente»** (descuenta la leche que se pida en la caja; enciende «Leche» y no se puede apagar mientras esté en la receta). Botón «+ Agregar renglón».
10. **«Crear producto»** / **«Guardar cambios»**. Avisos «Producto creado» / «Producto actualizado».

Reglas de la receta: máximo 30 renglones; no repetir insumo («La receta repite un insumo. Súmalo en un solo renglón.»); cantidades entre 0.001 y 100 000. Un producto **sin receta se vende, pero no descuenta nada**; la etiqueta «Sin receta» lo avisa (con Inventario encendido).

Si aún no hay categorías, «+ Nuevo producto» abre primero «Nueva categoría»: «Primero una categoría — Cada producto va en una categoría. Crea la primera y seguimos.»

### 14.6 Borrar un producto [Solo administradores]
- «Eliminar producto» → «Sí, eliminar». **Siempre se puede borrar**, haya tenido ventas o no, y **no se puede deshacer**.
- Los tickets viejos no se pierden: cada renglón guardó su propia copia (nombre, precio, foto). Reportes lo sigue contando y lo marca **«(fuera del menú)»**. Lo que se pierde es la receta. El inventario ya descontado no se restituye.
- Antes de confirmar pregunta «Se vendió N veces. Los tickets y reportes lo conservan.» o «Se quita del menú y de las recetas.»; ese número solo cuenta los últimos ~9 días, así que puede decir que no hay ventas aunque haya ventas más viejas. Después del borrado el aviso «Producto eliminado» sí usa el conteo completo.
- Para **sacar un producto del menú sin perderlo**: pausarlo (14.3).

### 14.7 Categorías [Solo administradores]
Las categorías las crea el negocio (no vienen fijas): se crean, renombran, reordenan, ocultan y borran desde la tarjeta «Categorías».
- **«+ Nueva categoría»**: nombre (máx. 60) y emoji, con el interruptor «Ofrecer en el punto de venta». No puede repetirse el nombre.
- **▲ / ▼**: cambian el orden en que aparecen como filtro en la caja (primero lo que más se vende).
- **Renombrar** es seguro: el identificador interno se fija al crearla y ya no cambia, así que las ventas y productos siguen donde estaban.
- **Ocultar no es borrar**: una categoría apagada deja de ofrecerse en el filtro de la caja y en el formulario de producto, pero **sus productos se siguen vendiendo** (siguen apareciendo en «Todos»). Para sacar productos del menú hay que pausarlos uno por uno.
- **Borrar** una categoría vacía: «Eliminar» → «Sí». Una categoría con productos: «Eliminar…» abre «Eliminar categoría», que pregunta «Pasar los productos a» otra categoría («Mudar y eliminar»); ningún producto se queda sin categoría. No se puede si es la única categoría.

### 14.8 Leches y extras [Solo administradores]
Tarjeta «Leches y extras de toda la carta» (opciones globales: valen para todo el menú).
- **Leches**: cada una tiene nombre, «Cargo extra» (0 si no cuesta más; 0–10 000), y «Insumo que descuenta» (déjalo vacío si se prepara en agua: «No descuenta inventario»). Interruptor para ofrecerla, «Editar» y «Eliminar». Una leche apagada («Apagada») ya no sale en la caja.
- **Extras**: nombre, precio (0–10 000) y los insumos que descuentan («Insumos que descuenta» con cantidad; máximo 10 renglones). Interruptor, «Editar» y «Eliminar».
- Al borrar una leche o un extra no se afectan los tickets ya cobrados.

### 14.9 Qué no se puede en Productos
Reordenar productos (solo categorías se reordenan), duplicar un producto, cambiar precios en bloque, importar o exportar, programar disponibilidad por horario, más de una foto por producto, una cantidad de leche distinta por tipo de leche, ni deshacer un borrado. Los guardados de producto/extra no son una sola operación: si algo falla a medias, revisa la receta del producto.

---

## 15. CLIENTES Y LEALTAD — NO DISPONIBLE EN LA VERSIÓN ACTUAL

**Estado actual:** el programa de lealtad está construido pero **oculto en la interfaz**. Si el CONTEXTO EN VIVO dice «OCULTO», esto es lo que aplica:
- No hay menú «Clientes y lealtad» (la dirección /clientes regresa a Inicio).
- El Punto de venta **no** muestra selector de cliente y **no se otorgan puntos** al cobrar.
- Ajustes no muestra el interruptor «Lealtad y clientes» ni los campos de puntos.
- La tarjeta pública con QR (`/tarjeta/…`) muestra «Esta página no existe».
- **Tampoco se puede ver el QR de reseñas de Google**: ese QR estaba dentro de Clientes. Hoy el enlace, la calificación y el número de reseñas que se capturan en Ajustes solo alimentan la tarjeta «Reseñas de Google» de Inicio (calificación y contador).
- Si alguien pregunta por puntos, tarjeta digital o QR de reseñas, la respuesta es que **hoy no está disponible** y que reactivarlo depende de quien administra el desarrollo del sistema.

**Cuando esté visible** (solo si el CONTEXTO EN VIVO lo dice), funciona así:
- Cada cliente registrado acumula `puntos por peso × total` en cada compra (el total incluye la propina y ya trae el descuento), y una visita. El canje de una bebida cuesta el número de puntos que se defina en Ajustes.
- Niveles por puntos: «Brote» (menos de 600), «Hoja» (600 a 1 499) y «Ceremonial» (1 500 o más).
- Módulo Clientes (solo administradores): «+ Nuevo cliente» (nombre obligatorio; teléfono, correo y notas opcionales; el teléfono no se puede repetir), buscador, ficha con puntos, nivel y QR de su tarjeta, «Sumar 50 pts (cortesía)», «Canjear bebida · N pts», «Editar datos» y «Dar de baja» (no se puede reactivar ni borrar; su historial de ventas se conserva).
- En la caja se elige al cliente en el selector «Cliente de lealtad» («Venta al público» si no aplica) antes de cobrar.
- Cancelar un ticket resta los puntos y la visita que había dado.
- La tarjeta pública muestra solo el primer nombre, los puntos, el nivel y las visitas, y es de solo lectura.

---

## 16. CÓMO FUNCIONA POR DENTRO — reglas que explican el comportamiento

1. **El servidor pone los precios.** La caja manda qué se pidió y cuánto; el total se recalcula leyendo el menú de la base de datos. Ningún navegador puede cambiar un total.
2. **Cobrar es una sola operación.** El ticket, el descuento de insumos, los movimientos, la propina y (si estuviera activo) los puntos ocurren juntos: o queda todo, o no queda nada.
3. **Cada acción devuelve el estado completo.** Por eso la pantalla siempre muestra lo último, aunque otra caja haya vendido hace un segundo. Además se refresca sola cada 15 segundos.
4. **El día operativo es el día calendario en la zona horaria del negocio** (de las 00:00 a las 24:00 de esa zona), no la del dispositivo. **No hay una hora de corte configurable**: una venta a las 00:30 cuenta para el día siguiente y no entra en el corte del día anterior. Cambiar la zona horaria a mitad de operación puede desalinear qué tickets se pueden modificar y qué cortes existen.
5. **La fecha de una venta es el momento en que se cobra.** No se puede fijar otra.
6. **El folio** es un número consecutivo global. No se reinicia cada día ni cada corte. Un ticket cancelado conserva su folio; uno borrado deja un hueco.
7. **La propina** se guarda en su propia columna, nunca disuelta en el total, para que el corte pueda decir qué parte del efectivo es venta y qué parte se reparte. El descuento se aplica al consumo, nunca a la propina, y la propina no puede pasar del consumo.
8. **Tickets cancelados**: se cuentan aparte y nunca suman dinero.
9. **Los tickets guardan su propia copia** del producto al momento de la venta: cambiar o borrar productos no reescribe el pasado.
10. **Cancelar y borrar solo antes del corte** de ese día.
11. **Ventana de datos**: la aplicación carga los últimos ~9 días de ventas (más todas las comandas abiertas) para ser rápida. Nada se pierde: el histórico completo se consulta en Reportes.
12. **Módulos apagados cambian el comportamiento real** (Inventario deja de descontar; Mercado Pago deja de aceptarse), no solo lo que se ve.
13. **Tarjeta y Mercado Pago se registran, no se procesan.** No hay terminal conectada; el corte los separa para conciliarlos contra el estado de cuenta.
14. **Seguridad**: nadie lee la base de datos desde fuera. Iniciar sesión dice quién eres; lo que puedes hacer lo decide la lista del equipo (Ajustes → Equipo).

---

## 17. LO QUE EL SISTEMA NO HACE (verificado)

Si alguien pide algo de esta lista, la respuesta es «no se puede» (y, si el negocio lo necesita, es una función que habría que pedirle a quien desarrolla el sistema).

**Fechas y cortes**
- Registrar ventas, tickets o un corte de caja de una **fecha pasada** («capturar una venta atrasada»). Cada venta se guarda con el momento en que se cobra.
- Hacer el corte de un día anterior, o reabrir el corte de un día anterior (solo se reabre el de hoy).
- Configurar una hora de cierre del día (turnos que cruzan la medianoche cuentan por día calendario).
- Avisar de un día que quedó sin corte.

**Tickets ya cobrados**
- Editar el método de pago, la propina, «Para aquí/Para llevar», el descuento, el cliente, la fecha o el contenido de un ticket (solo cancelar, quitar un renglón o borrar; ver sección 11).
- Agregar productos a un ticket ya cobrado.
- Deshacer una cancelación o un borrado.
- Modificar tickets de más de ~9 días desde ninguna pantalla, ni de un día con corte hecho.

**En la caja**
- Editar precios al vender, escribir un descuento libre (solo hay 3 promociones), propina en pesos, pagar un ticket con dos métodos, cuentas abiertas o por mesa, dividir la cuenta, guardar un ticket «para después», cobrar sin internet.
- Imprimir tickets o comandas.
- Bloquear una venta por falta de insumos.

**Dinero y fiscal**
- Cobrar con terminal de tarjeta o con Mercado Pago (solo se registra).
- Facturar, timbrar o generar CFDI.
- Costos, utilidad o márgenes (el sistema no guarda costos).

**Inventario y menú**
- Ver el historial de movimientos de inventario (se guarda, pero no hay pantalla), anotar comentarios en movimientos, archivar insumos, proveedores u órdenes de compra, importar o exportar inventario o productos.
- Pausar un producto automáticamente cuando se acaba un insumo.
- Reordenar productos, duplicarlos, cambio masivo de precios, disponibilidad por horario.
- Conectar los productos preparados (caducidades) al inventario o venderlos desde la caja.

**Reportes**
- Exportar a PDF o a Excel nativo (solo CSV de tickets), comparar periodos, filtrar por producto, categoría o cajero, o ver los modificadores (leche, dulzor, extras) de un ticket en el histórico.

**Equipo y configuración**
- Invitar o crear usuarios desde la aplicación, editar su nombre o correo, cambiar tu propio rol, desactivarte o quitarte a ti mismo.
- Cambiar el nombre del negocio o la moneda desde la pantalla.
- Mostrar el logo fuera de Ajustes.
- Varias sucursales (la aplicación asume una).
- Modo sin conexión.

**Comunicación y reseñas**
- Enviar mensajes de WhatsApp o correo, notificaciones fuera de la aplicación.
- Traer las reseñas de Google automáticamente (se capturan a mano; y hoy el QR de reseñas no es accesible, ver sección 15).
- Programa de lealtad y tarjeta digital (existen pero están ocultos hoy).

---

## 18. SITUACIONES FRECUENTES Y QUÉ HACER

### 18.1 «Se me olvidó registrar / capturar un día» (por ejemplo, el 9 de septiembre)
Esta es la situación más importante porque la respuesta es un «no se puede».

**La respuesta corta:** el sistema **no permite registrar ventas ni hacer el corte de caja de una fecha pasada**. Cada venta se guarda con el día y la hora en que se cobra, y el corte de caja siempre es del día en curso. No existe un botón u opción para «capturar un día atrasado».

**Qué significa en la práctica:**
- Si las ventas de ese día **nunca se cobraron en el sistema**, ese día simplemente no tiene datos: en Reportes → Histórico de ventas no aparecerá (solo se listan periodos con tickets) y no habrá corte de caja para esa fecha en «Cortes anteriores».
- Si las ventas **sí se cobraron pero nunca se hizo el corte** de ese día, las ventas siguen en Reportes con su total; solo falta el corte (la conciliación del efectivo de ese día), y **ese corte ya no se puede hacer**. Los tickets de ese día se pueden seguir cancelando o corrigiendo mientras estén dentro de los últimos ~9 días.

**Qué NO hacer:** no cobrar hoy las ventas de aquel día «para que queden» (quedarían con la fecha de hoy, inflarían las ventas y el corte de hoy y descontarían insumos hoy) y no cambiar la zona horaria para acomodar fechas. Distorsionan reportes, inventario y corte.

**Qué sí se puede hacer:**
1. Llevar ese día **por fuera** del sistema (una nota o una hoja de cálculo) para las cuentas del negocio.
2. Arreglar el **inventario**: las ventas de ese día gastaron insumos que el sistema no descontó. Haz un **«Contar»** de los insumos para dejar la existencia real (sección 12.3).
3. Si al negocio le hace falta poder capturar ventas o cortes de días pasados, hay que **pedirle esa función a quien desarrolla el sistema**: hoy no existe.

### 18.2 «Cobré mal un ticket» (monto, método de pago, propina, modo de servicio)
1. Un **administrador** cancela el ticket: Comandas → «Cancelar ticket» → «Sí, cancelar» (o desde Administración de pedidos).
2. Se vuelve a cobrar correctamente en el Punto de venta (tendrá otro folio y la hora actual).
3. Solo funciona si el **corte del día del ticket no se ha hecho**. Si el corte de hoy ya se hizo: Corte de caja → «Reabrir turno», corregir y cerrar de nuevo. Si el ticket es de un día anterior con corte hecho, el sistema no lo permite.
- Si solo **sobra un producto**: en Administración de pedidos, «Quitar» ese renglón (sin cancelar todo).
- Un empleado que se equivocó debe avisarle a un administrador: no puede cancelar.

### 18.3 «Le cobré con el método equivocado / se me olvidó la propina»
Son datos que no se editan después del cobro. Se corrige cancelando y volviendo a cobrar (18.2).

### 18.4 «Hice el corte de caja por error» o «me faltó cobrar algo»
Un administrador: Corte de caja → «Reabrir turno» → «Sí, reabrir». Se borra el corte de hoy y el punto de venta vuelve a cobrar. Al terminar hay que hacer el corte de nuevo.

### 18.5 «La caja no cuadra»
1. Recuerda que **Efectivo esperado** = ventas en efectivo del día **más propina en efectivo**, **sin** el fondo de caja. Cuenta el cajón sin el fondo con el que abriste.
2. Revisa que la **zona horaria** de Ajustes sea la correcta: si no, el «día» no coincide con el del negocio.
3. Revisa si hay tickets cancelados o mal cobrados del día (Administración de pedidos, filtro «Solo hoy»).
4. Tarjeta y Mercado Pago no se cuentan contra el cajón.
5. Anota la explicación en «Notas del corte (opcional)».

### 18.6 «El inventario no cuadra»
1. Haz un **«Contar»** de los insumos para dejar la existencia real. Es la forma de volver a cuadrar.
2. Registra las mermas con el botón − (o descuenta lo que se tiró).
3. Revisa que los productos que se venden tengan **receta** (etiqueta «Sin receta»): sin receta no descuentan.
4. Revisa que el **empaque** (vasos, tapas) esté marcado como «Es empaque»; si no, se descuenta también en los pedidos «Para aquí».
5. Si el módulo **Inventario está apagado** en Ajustes, las ventas no descuentan nada.
6. Recuerda que una venta nunca se bloquea por falta de insumos y que la existencia nunca baja de 0.
7. Cancelaciones y quitar renglones pueden devolver de más en algunos casos (sección 12.8): otro motivo para contar.

### 18.7 «Se acabó un ingrediente»
Pausa el producto que lo usa (Productos → interruptor ON/OFF; lo puede hacer un empleado) y vuelve a activarlo al resurtir. Registra la llegada con «Recibir pedido».

### 18.8 «Un producto no aparece en la caja»
Está pausado (interruptor OFF en Productos), no está activo en el menú, o su categoría está oculta y se busca por el chip de esa categoría (sigue apareciendo en «Todos»). También se puede haber escrito mal en el buscador.

### 18.9 «Entró una persona nueva al equipo»
1. La persona inicia sesión con su correo (se registra como Empleado en espera).
2. Un administrador entra a **Ajustes → Equipo** y pulsa **«Activar»**. Si hace falta, cambia el rol.
3. La persona recarga la página.

### 18.10 «Alguien se fue del equipo»
Ajustes → Equipo → **«Desactivar»** (deja de entrar; su historial de ventas se conserva). «Quitar» la elimina de la lista sin poder deshacerlo.

### 18.11 «Se cayó el internet» / «me salió “Se perdió la conexión” al cobrar»
No hay modo sin conexión: sin internet no se puede cobrar. **Si el aviso apareció justo al pulsar «Cobrar», la venta pudo haberse registrado igual.** Antes de cobrar de nuevo, revisa en **Comandas** si ya existe el pedido para no cobrarlo dos veces. El sistema no tiene protección contra cobros duplicados.

### 18.12 «Quiero probar el sistema»
Cada venta descuenta insumos de verdad. Para practicar, cobra y luego un administrador borra el ticket de prueba desde Administración de pedidos (sección 11.5) o lo cancela desde Comandas.

### 18.13 «Quiero cambiar el precio / la receta / una foto»
Solo administradores, desde Productos (secciones 14.4 y 14.5).

### 18.14 «Quiero ver las ventas del mes pasado / del año»
Reportes → Histórico de ventas: atajos «Este mes», «Este año», «Todo» o fechas a la medida; agrupar por Mes. Para Excel, «Descargar CSV» (sección 8.3).

### 18.15 «¿Cuánto vendimos hoy?»
Solo administradores: Inicio, tarjeta «Venta de hoy» (incluye propina), o Corte de caja, «Venta total de hoy». El asistente no puede ver esas cifras.

---

## 19. PREGUNTAS RÁPIDAS

**¿Cuál es la diferencia entre «Para aquí» y «Para llevar»?** Para llevar descuenta también el empaque (vasos, tapas, popotes, bolsas); para aquí no. Siempre arranca en «Para llevar».

**¿Puedo poner un descuento distinto de 10 % o 15 %?** No; solo existen «Descuento 10%» y «Cliente frecuente 15%».

**¿Puedo dejar propina en pesos?** No; en porcentaje (10, 15, 20 o el que escribas, máx. 100 %).

**¿Los precios se pueden cambiar en la caja?** No. Se cambian en Productos (administrador).

**¿Se puede pagar mitad efectivo y mitad tarjeta?** No; cada ticket lleva un solo método de pago.

**¿Por qué no aparece Mercado Pago como opción?** El módulo está apagado en Ajustes (administrador).

**¿Qué pasa si vendo algo sin inventario?** Se vende igual; la existencia se queda en 0.

**¿Se pueden imprimir tickets?** No, el sistema no imprime tickets ni comandas.

**¿El cliente puede pedir factura?** No; el sistema no factura.

**¿Cómo cambio mi propio rol?** No puedes; otro administrador debe hacerlo en Ajustes → Equipo.

**¿Puedo entrar desde el celular?** Sí. En celular el empleado ve solo Venta y Comandas en la barra inferior; Inventario y Productos se abren desde una pantalla grande.

**¿Dónde veo cuánto tengo de un insumo?** En Inventario (empleados y administradores).

**¿Cómo registro que llegó mercancía?** Inventario → «Recibir pedido» en el insumo.

**¿Cómo registro que tiré algo?** Inventario → botón − (registra merma de 25 g, 250 ml o 1 pieza por toque).

**¿Cómo cuento el inventario?** Inventario → «Contar» en cada insumo.

**¿Se puede deshacer un borrado?** No, ninguno (tickets, productos, insumos, lotes desechados, usuarios quitados).

**¿Qué pasa si borro un producto que ya se vendió?** Sus ventas se conservan y en Reportes aparece «(fuera del menú)»; se pierde su receta.

**¿Puedo borrar un insumo?** Solo si ninguna receta (de producto ni de extra) lo usa; se borra con su historial.

**¿Cómo apago un producto sin borrarlo?** Interruptor ON/OFF en Productos.

**¿Cómo veo quién cobró un ticket?** En Reportes → Histórico → tickets («quién cobró») y en el CSV, columna «Cobró».

**¿Dónde veo las propinas?** Reportes (tarjeta «Propina»/«Propinas») y el registro del Corte de caja (propina total y en efectivo).

**¿Cuántos días de ventas ve la aplicación?** Las pantallas operativas usan aproximadamente los últimos 9 días; el histórico de Reportes llega hasta la primera venta.

**¿Mi cuenta dice “Cuenta en espera”?** Un administrador debe activarte en Ajustes → Equipo.

**¿Por qué veo un candado?** Ese módulo es solo para administradores.

**¿Cada cuánto se actualiza la pantalla?** Cada 15 segundos y después de cada acción.

---

## 20. MENSAJES DE ERROR Y AVISOS — qué significan

| Mensaje | Qué significa y qué hacer |
| --- | --- |
| «El corte de caja de hoy ya está cerrado» | No se puede cobrar: un administrador debe «Reabrir turno» en Corte de caja. |
| «El corte del día de este ticket ya se cerró; cancelarlo / borrarlo / cambiarlo descuadraría la caja» | El día de ese ticket tiene corte. Solo se puede tocar si es de hoy y se reabre el turno. |
| «Es el único producto del ticket; borra el ticket completo» | No se puede quitar el último renglón; cancela o borra el ticket. |
| «El ticket #N ya estaba cancelado» | Ya se canceló antes. |
| «Un ticket cancelado ya no se mueve.» | Los cancelados no cambian de estado. |
| «Mercado Pago está desactivado en Ajustes» | El módulo está apagado; elige otro método o pide que lo enciendan. |
| «El producto "X" ya no está en el menú» | Alguien lo pausó o borró; quítalo del ticket. |
| «La propina no puede pasar del 100% del consumo.» | Corrige el porcentaje de propina. |
| «La propina no puede ser mayor que el consumo» | El servidor topa la propina al consumo (con descuento). |
| «El ticket está vacío.» | Agrega productos. |
| «Demasiados renglones en un solo ticket.» | Máximo 60 renglones por ticket. |
| «Esta acción es solo para administradores.» | Tu perfil es Empleado; pídeselo a un administrador. |
| «Tu cuenta todavía no ha sido autorizada por un administrador.» | Cuenta en espera o desactivada; un administrador debe activarla. |
| «Necesitas iniciar sesión.» | La sesión terminó; recarga la página e inicia sesión. |
| «No se pudo guardar» (título) + un motivo | Falló la acción; el detalle dice por qué. |
| «Se perdió la conexión» | Sin internet o respuesta perdida. Ver 18.11 antes de repetir un cobro. |
| «Este insumo se usa en N receta(s). Quítalo de ahí antes de eliminarlo.» | Quita el insumo de las recetas (Inventario → Consumo, o Productos) y vuelve a intentar. |
| «Ya existe un producto / una categoría / un extra / un tipo de leche con ese nombre.» | Los nombres no se repiten (sin importar mayúsculas). |
| «La receta repite un insumo. Súmalo en un solo renglón.» | Un insumo solo puede aparecer una vez en la receta. |
| «La receta de este producto usa «leche elegida». Quita ese renglón antes de apagar la opción de leche.» | Quita primero «Leche elegida por el cliente» de la receta. |
| «Esa categoría tiene N producto(s). Elige a qué categoría pasarlos antes de eliminarla.» | Usa «Eliminar…» y elige la categoría destino. |
| «Ya hay productos en la carta. El catálogo inicial sólo se puede cargar cuando está vacía.» | El catálogo sugerido solo se carga con la carta vacía. |
| «No puedes cambiar tu propio rol…» / «No puedes desactivar tu propia cuenta.» / «No puedes eliminar tu propia cuenta.» | Lo debe hacer otro administrador. |
| «El corte de hoy ya fue registrado» | Ya se hizo el corte de hoy. |
| «La fecha inicial es posterior a la final. Revisa el rango.» | Corrige las fechas del histórico. |
| «Falta configurar la base de datos / el inicio de sesión. Avísale a quien instaló la aplicación.» | Problema de instalación; no lo resuelve el equipo. |
| «Archivo demasiado grande — El límite es 25 MB.» | Reduce la imagen. |
| «La subida fue rechazada» | Problema del servicio de imágenes; avisa a quien instaló el sistema. |
| «Hubo un problema con la base de datos» | Pulsa «Volver a intentar»; si sigue, avisa a quien instaló el sistema. |

---

## 21. GLOSARIO

- **Folio**: número consecutivo de una venta; es como se nombra un pedido en barra.
- **Comanda**: el pedido visto desde la barra: qué preparar y en qué estado va.
- **Ticket**: la venta con todos sus renglones, su total y su método de pago.
- **Renglón**: cada producto dentro de un ticket, con su cantidad y modificadores.
- **Insumo**: materia prima o material: matcha, leche, vasos, bakery.
- **Receta**: cuánto insumo consume un producto; es lo que permite descontar solo.
- **Empaque**: insumos que solo se gastan en pedidos para llevar.
- **Merma**: producto o insumo que se pierde o se tira, y se descuenta a mano (botón −).
- **Umbral / mínimo**: cantidad a partir de la cual un insumo entra en alerta.
- **Nivel objetivo**: cuánto cabe de un insumo cuando está bien surtido; sirve para fijar la alerta como porcentaje.
- **Conteo físico**: contar lo que hay y reemplazar la existencia del sistema con esa cifra («Contar»).
- **Lote**: una tanda de producto preparado en casa, con su fecha de caducidad.
- **Categoría**: grupo con el que se filtra el menú en la caja; la define el negocio.
- **Día operativo**: el día del negocio según su zona horaria; es el que usa el corte.
- **Corte de caja**: el cierre del día: cuadra el efectivo contado contra el esperado.
- **Consumo**: lo que se cobra por los productos, ya con descuento y sin contar la propina.
- **Fondo de caja**: el dinero con el que arranca el cajón; solo referencia en el corte.
- **Anulado / Cancelado**: ticket cancelado; en Comandas y Pedidos se dice «Cancelado» y en Reportes «Anulado».
- **Fuera del menú**: producto que se borró del menú pero cuyas ventas se conservan.

---

## 22. CUÁNDO AVISAR A QUIEN INSTALÓ EL SISTEMA

El equipo no puede resolver, y hay que avisar a quien instaló o desarrolla el sistema, cuando:
- Aparece «Falta conectar un servicio» o «Hubo un problema con la base de datos» y «Volver a intentar» no lo arregla.
- «La subida fue rechazada» o no aparece el botón de subir imágenes.
- Nadie puede iniciar sesión.
- Se necesita una función que hoy no existe (capturar días atrasados, imprimir tickets, facturar, reactivar lealtad, ver el historial de inventario, etc.).
- Los reportes muestran un error de actualización pendiente («falta una actualización de la base de datos»).

Todo lo demás (activar personas, cambiar precios, corregir tickets, contar inventario, hacer o reabrir el corte) lo resuelve un administrador desde la propia aplicación.
