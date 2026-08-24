# Puesta en marcha · lo que falta hacer a mano

La aplicación ya no es una demo: el código está completo, la base de datos está
creada y vacía, y el bucket de imágenes existe. Lo que queda son las
credenciales, que por seguridad no se pueden copiar de forma automática.

**Tiempo estimado: 25–35 minutos.**

---

## Resumen: qué está hecho y qué falta

| Pieza | Estado | Te toca |
| --- | --- | --- |
| Base de datos Supabase | ✅ Proyecto creado, esquema aplicado, base vacía | Copiar 1 llave secreta |
| Bloqueo de seguridad de la base | ✅ Verificado: la llave pública no lee nada | Nada |
| Autenticación Clerk | ⚠️ El código está listo | Crear la app de Clerk y copiar 2 llaves |
| Imágenes Cloudflare R2 | ⚠️ Bucket creado | Crear token de API, configurar CORS |
| Datos de prueba de la demo | ✅ Borrados | Nada |
| Despliegue | ⚠️ — | Cargar variables y desplegar |

Al terminar cada paso, `npm run doctor` te dice si quedó bien.

---

## ⚠️ Antes de empezar: dos advertencias importantes

**1. Las credenciales que ya estaban en el entorno son de otro proyecto tuyo.**

El entorno de desarrollo traía estas variables ya definidas:

```
NEXT_PUBLIC_SUPABASE_URL      → apunta a un proyecto con tablas de una clínica
SUPABASE_SERVICE_ROLE_KEY     → llave de ese mismo proyecto
NEXT_PUBLIC_CLERK_*           → instancia de Clerk "assured-condor-11"
```

Ese proyecto de Supabase contiene `patients`, `appointments`,
`kinesiologist_notes`… es decir, **no es TomoMatcha**. Si dejas esas variables,
la aplicación intentará leer tablas que no existen ahí y no arrancará.

Hay que **reemplazarlas** por las de TomoMatcha (pasos 1 y 2).

**2. Nunca subas las llaves al repositorio.** `.gitignore` ya excluye
`.env*`, así que trabaja siempre con `.env.local` en local y con el panel de
variables de entorno en producción.

---

## Paso 1 · Supabase (base de datos) — 5 minutos

### 1.1 El proyecto ya existe

Se creó un proyecto dedicado en tu organización de Supabase:

| Dato | Valor |
| --- | --- |
| Nombre | `tomomatcha` |
| Referencia | `leaknhdbazizmbofupyx` |
| Región | `us-east-1` |
| URL de la API | `https://leaknhdbazizmbofupyx.supabase.co` |

Ya tiene aplicadas las cuatro migraciones de `supabase/migrations/`: 15 tablas,
los enums, los índices, las funciones transaccionales y el bloqueo de seguridad.
La base está **vacía** — sin datos de prueba.

### 1.2 Copiar la llave `service_role`

Es lo único que falta de Supabase, y no se puede automatizar: es la llave que da
acceso total a la base.

1. Abre <https://supabase.com/dashboard/project/leaknhdbazizmbofupyx/settings/api>
2. Baja a **Project API keys**.
3. En la fila **`service_role`** haz clic en **Reveal** y cópiala.
4. Pégala en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://leaknhdbazizmbofupyx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=pega-aqui-la-llave-service_role
```

> **Por qué esta llave y no la pública:** la aplicación nunca habla con Supabase
> desde el navegador. Todas las tablas tienen RLS activa y **sin ninguna
> política**, así que la llave pública no puede leer ni escribir nada. El único
> camino es el servidor de Next.js, que autoriza con la sesión de Clerk antes de
> tocar la base. Por eso la llave `service_role` sólo debe existir como variable
> de servidor: **jamás en una variable `NEXT_PUBLIC_`**.

### 1.3 (Opcional) Comprobar el bloqueo tú mismo

Copia también la llave pública (`anon` o la `publishable`) en
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. La aplicación no la usa, pero con ella
`npm run doctor` verifica que efectivamente no tenga acceso a nada.

### 1.4 Si prefieres usar otro proyecto de Supabase

Aplica las migraciones en orden desde el **SQL Editor** del panel:

1. `supabase/migrations/20260824000001_core_schema.sql`
2. `supabase/migrations/20260824000002_rpc.sql`
3. `supabase/migrations/20260824000003_cancel_order.sql`
4. `supabase/migrations/20260824000004_harden_function_grants.sql`

O con la CLI de Supabase:

```bash
supabase link --project-ref TU_REFERENCIA
supabase db push
```

---

## Paso 2 · Clerk (autenticación) — 10 minutos

### 2.1 Crear una aplicación propia para TomoMatcha

Las llaves de Clerk que traía el entorno pertenecen a la instancia
`assured-condor-11`, que parece compartida con otro proyecto tuyo. **Conviene
crear una aplicación dedicada**: si la compartes, cualquiera con cuenta en el
otro proyecto podrá al menos llegar a la pantalla de "esperando autorización" de
TomoMatcha.

> Nota: aunque compartieras la instancia, nadie entraría a la caja sin que un
> administrador lo active en Ajustes → Equipo. Pero es mejor separarlas.

1. Entra a <https://dashboard.clerk.com> y crea una aplicación nueva.
2. Nómbrala **TomoMatcha**.
3. En métodos de inicio de sesión, activa lo que vayan a usar en la barra. La
   recomendación para una cafetería:
   - **Correo electrónico + contraseña** (funciona sin depender de otra cuenta)
   - **Google** (opcional, cómodo si el equipo ya usa Gmail)
4. Desactiva lo que no vayan a usar, para que la pantalla quede simple.

### 2.2 Copiar las dos llaves

1. En la aplicación nueva, ve a **API Keys**.
2. Copia **Publishable key** y **Secret key** (elige el framework *Next.js* para
   que te dé los nombres exactos de las variables).
3. Pégalas en `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Las dos tienen que ser del **mismo entorno**: las dos de test, o las dos de
producción. `npm run doctor` avisa si las mezclas.

### 2.3 Definir quién es administrador

El primer usuario que inicie sesión queda como **administrador activo**. Si
prefieres fijarlo por correo (más seguro si varias personas van a registrarse el
mismo día):

```env
BOOTSTRAP_ADMIN_EMAILS=tu-correo@dominio.com,otro-admin@dominio.com
```

Cualquier otro usuario que se registre queda **inactivo** hasta que un
administrador lo active en **Ajustes → Equipo**. Eso es intencional: registrarse
no debe alcanzar para entrar a la caja.

### 2.4 Para producción (cuando el negocio ya opere)

Las llaves `pk_test_` / `sk_test_` son del entorno de desarrollo de Clerk: sirven
para probar, tienen límites y muestran avisos de modo desarrollo.

1. En el panel de Clerk, crea la **instancia de producción**.
2. Configura el dominio (Clerk pide unos registros DNS de tipo CNAME).
3. Copia las llaves `pk_live_` / `sk_live_` y úsalas en las variables de
   producción de tu hosting.

Las rutas de sesión ya están en el código, no hay que configurarlas en Clerk:
`/sign-in` y `/sign-up`.

---

## Paso 3 · Cloudflare R2 (imágenes y media) — 10 minutos

**Es opcional.** Sin R2 la aplicación funciona completa; sólo se desactiva la
subida de fotos de productos y del logo, y la interfaz lo dice claramente.

### 3.1 El bucket ya existe

Se creó en tu cuenta de Cloudflare:

| Dato | Valor |
| --- | --- |
| Nombre del bucket | `tomomatcha-media` |
| Región | ENAM (Norteamérica este) |
| Clase | Standard |

### 3.2 Obtener el Account ID

1. Entra a <https://dash.cloudflare.com> y abre **R2**.
2. En el panel lateral derecho aparece **Account ID**. Cópialo.

```env
R2_ACCOUNT_ID=pega-aqui-el-account-id
R2_BUCKET=tomomatcha-media
```

### 3.3 Crear el token de API

1. En **R2**, haz clic en **Manage API tokens** (arriba a la derecha).
2. **Create API token**.
3. Configúralo así:
   - **Token name**: `tomomatcha-app`
   - **Permissions**: **Object Read & Write**
   - **Specify bucket(s)**: sólo `tomomatcha-media`
   - **TTL**: sin expiración (o la que prefieras, recordando renovarlo)
4. **Create API Token**.
5. Copia **Access Key ID** y **Secret Access Key**. La secreta **sólo se muestra
   una vez**.

```env
R2_ACCESS_KEY_ID=pega-aqui-el-access-key-id
R2_SECRET_ACCESS_KEY=pega-aqui-la-secret-access-key
```

> Si el token te da un **Endpoint** con un formato distinto al estándar, ponlo en
> `R2_ENDPOINT` y puedes omitir `R2_ACCOUNT_ID`.

### 3.4 Configurar CORS ← el paso que más se olvida

Las imágenes suben **directo del navegador al bucket** con una URL firmada, para
que un archivo grande no tenga que pasar por el servidor. Para que el navegador
tenga permiso de hacerlo, el bucket necesita reglas de CORS. **Sin esto la subida
falla** (la aplicación te mostrará un aviso mencionando CORS).

1. En **R2 → `tomomatcha-media` → Settings**.
2. Busca **CORS Policy** y haz clic en **Add CORS policy** / **Edit**.
3. Pega esto, cambiando los dominios por los tuyos:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://tu-dominio-de-produccion.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Si despliegas en Vercel, agrega también el dominio de las vistas previas:

```json
"https://tu-proyecto.vercel.app"
```

`npm run doctor` comprueba que existan reglas de CORS y que permitan `PUT`.

### 3.5 (Recomendado) Dominio público para las imágenes

Sin dominio público las imágenes se sirven a través de la aplicación
(`/api/media/...`), que firma cada descarga y sólo responde a usuarios con
sesión. Funciona, pero cada imagen es una petición más al servidor.

Con dominio público, Cloudflare las sirve cacheadas y la aplicación ni interviene:

1. **R2 → `tomomatcha-media` → Settings → Public access**.
2. Opción rápida: activa **r2.dev subdomain** y copia la URL que te da.
3. Opción recomendada: **Connect Custom Domain**, por ejemplo
   `media.tudominio.com`.
4. Pon la URL resultante, **sin diagonal al final**:

```env
R2_PUBLIC_BASE_URL=https://media.tudominio.com
```

> Ten en cuenta que con dominio público las fotos de los productos quedan
> accesibles a quien tenga la URL. Para fotos de menú eso normalmente es lo que
> se quiere; si prefieres que sólo el equipo las vea, deja esta variable vacía.

---

## Paso 4 · Probar en local — 3 minutos

```bash
npm install
cp .env.example .env.local     # y llenarlo con los pasos 1–3
npm run doctor
```

Deberías ver algo así:

```
✓ Supabase · conectado · 15 tablas · 0 productos · 0 usuarios · zona America/Mexico_City
✓ Supabase · funciones · create_order, close_cash y compañía disponibles
✓ Supabase · seguridad · la llave pública no tiene acceso (HTTP 401), como debe ser
✓ Clerk · conectado · entorno de desarrollo
✓ Cloudflare R2 · conectado · bucket "tomomatcha-media"
✓ Cloudflare R2 · CORS · configurado para http://localhost:3000, ...
```

Luego:

```bash
npm run dev     # http://localhost:3000
```

Al abrirlo te manda a iniciar sesión. Crea tu cuenta: como es la primera, entras
como **administrador**.

---

## Paso 5 · Primer arranque del negocio — 10 minutos

En este orden:

1. **Ajustes → Datos del negocio.** Nombre, sucursal, **zona horaria** (de ella
   depende el día operativo y el corte de caja), fondo de caja, puntos por peso y
   puntos para canjear.
2. **Ajustes → Módulos.** Enciende o apaga inventario, lealtad, reseñas y Mercado
   Pago según lo que vayan a usar.
3. **Ajustes → Catálogo inicial sugerido.** Un clic carga 26 insumos con sus
   recetas, 22 productos, 5 leches y 5 extras de TomoMatcha. Todo queda editable.
   - Si prefieres capturar tu propia carta, ignóralo y ve a **Productos → Nuevo
     producto**.
   - Sólo aparece cuando la carta está vacía, para no duplicar nada.
4. **Inventario.** Las existencias arrancan en **cero** a propósito: el inventario
   real se captura contando la barra. Usa el botón **Contar** de cada insumo para
   registrar lo que hay; la diferencia queda en la bitácora.
   - Cuando llegue mercancía usa **Recibir pedido**, que *suma* a lo que había.
     **Contar** *reemplaza* el total. No son lo mismo.
   - Marca como **empaque** los vasos, tapas, popotes y bolsas. Esos insumos sólo
     se descuentan en los pedidos «para llevar». Los dos vasos del catálogo
     inicial ya vienen marcados.
   - Si quieres que el aviso salga a cierto porcentaje, escribe el **nivel
     objetivo** del insumo (lo que cabe lleno) y pulsa «Avisar al 25 / 50 / 75 %».
   - Para revisar o cambiar **cuánto gasta cada producto** de un insumo, abre
     **Consumo** en ese insumo: ahí ves todos los productos que lo usan, editas
     los mililitros o gramos y puedes añadirlo a la receta de otro producto.
5. **Productos preparados.** Si preparan jarabes, mermeladas o pasteles en casa,
   regístralos en **Preparados** con su fecha de elaboración y de caducidad. La
   alerta del último día no se va sola: se queda hasta que alguien pulsa «Ya lo
   revisé».
6. **Ajustes → Equipo.** Pide a los baristas que inicien sesión, y actívalos aquí
   con el rol que corresponda.
7. **Clientes.** Registra a los primeros; cada uno recibe su QR de lealtad
   escaneable.
8. **Punto de venta.** Haz una venta de prueba **para llevar** y confirma que
   aparece en Comandas, descuenta inventario (incluido el vaso) y suma puntos.
   Repite una **para aquí** y comprueba que esa vez el vaso no bajó. Si fueron
   sólo pruebas, anúlalas desde Comandas → **Cancelar ticket** (devuelve insumos
   y puntos).

---

## Paso 6 · Desplegar — 5 minutos

Con Vercel:

1. Importa el repositorio en <https://vercel.com/new>. Detecta Next.js solo.
2. **Settings → Environment Variables**: carga todas las variables de
   `.env.example` que hayas llenado. Marca **Production** y **Preview**.
3. Deploy.
4. Abre `https://tu-dominio/api/health`. Debe responder:

```json
{ "ready": true, "services": { "supabase": { "ok": true }, "clerk": { "ok": true }, "r2": { "ok": true } } }
```

5. Vuelve al **paso 3.4** y agrega el dominio de producción a las reglas de CORS
   de R2.
6. Si usas Clerk en producción, cambia las llaves a `pk_live_` / `sk_live_`.

---

## Lista de verificación final

- [ ] `npm run doctor` sin errores
- [ ] `/api/health` responde `ready: true`
- [ ] Puedo iniciar sesión y entro como administrador
- [ ] Un segundo usuario queda en "esperando autorización" hasta que lo activo
- [ ] Ajustes tiene el nombre, la sucursal y la **zona horaria** correctos
- [ ] La carta tiene productos con su receta
- [ ] Las existencias de inventario reflejan lo que hay en la barra
- [ ] Una venta de prueba: crea comanda, descuenta insumos y suma puntos
- [ ] El corte de caja cuadra y pausa el cobro; reabrir vuelve a permitirlo
- [ ] El QR de un cliente abre su tarjeta al escanearlo con el teléfono
- [ ] Puedo subir la foto de un producto (si configuraste R2)
- [ ] Borré la venta de prueba con **Cancelar ticket**

---

## Si algo no funciona

| Lo que ves | Qué significa | Cómo se arregla |
| --- | --- | --- |
| Pantalla "Falta conectar un servicio" | Faltan variables de entorno | Te dice cuáles. Pasos 1 y 2 |
| "Hubo un problema con la base de datos" | Las llaves no corresponden al proyecto, o faltan migraciones | `npm run doctor` lo diagnostica |
| `Could not find the table 'public.staff'` | Las migraciones no están aplicadas en ese proyecto | Paso 1.4 |
| `Invalid API key` | La llave está mal copiada o es de otro proyecto | Paso 1.2 |
| "la llave es del proyecto X pero la URL apunta a Y" | Mezclaste credenciales de dos proyectos | Copia las dos del mismo |
| "Tu cuenta todavía no ha sido autorizada" | Funciona correctamente | Un administrador te activa en Ajustes → Equipo |
| Redirige a `accounts.dev` en lugar de a `/sign-in` | Falta reiniciar tras cambiar las llaves | Reinicia el servidor |
| "La subida fue rechazada" al subir una foto | Falta CORS en el bucket | Paso 3.4 |
| "el bucket no tiene reglas de CORS" en el doctor | Igual que el anterior | Paso 3.4 |
| El botón de subir imagen no aparece | R2 sin configurar | Paso 3 |
| Las fotos salen como imagen rota | `R2_PUBLIC_BASE_URL` mal escrita, o sin sesión | Quita la diagonal final; vuelve a iniciar sesión |
| El corte de caja no cuadra con el día | Zona horaria equivocada | Ajustes → Zona horaria |
| El punto de venta dice "caja cerrada" | El corte de hoy ya se registró | Corte de caja → Reabrir turno |

---

## Cosas que quedan fuera del alcance actual

Para que quede explícito qué **no** hace la aplicación todavía:

1. **Cobro real con tarjeta o Mercado Pago.** Queda para la **etapa 2**. Hoy los
   métodos se registran para el corte, pero no hay integración con terminal ni
   con la API de Mercado Pago. Se necesitaría una cuenta de vendedor y el flujo
   de pagos (webhooks incluidos).
2. **Sincronizar reseñas de Google.** El QR para dejar reseña es real; traer las
   reseñas y la calificación automáticamente requiere la API de Google Business
   Profile (con facturación activada). Hoy la calificación se captura a mano en
   Ajustes.
3. **Mensajes por WhatsApp.** Los teléfonos de los clientes se guardan, pero no
   hay envío de campañas: haría falta WhatsApp Business API o un proveedor.
4. **Varias sucursales.** El esquema lo soportaría, pero la interfaz asume una.
5. **Facturación / CFDI.** No hay timbrado ni conexión con un PAC.
6. **Documentos legales** (aviso de privacidad, términos, contratos laborales).
   No son trabajo de la aplicación; se acordó tratarlos aparte.

Cada punto es un proyecto en sí. Si vas a atacar alguno, dímelo y lo planeamos.
