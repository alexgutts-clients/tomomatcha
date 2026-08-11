# TomoMatcha · Demo de operación

Demo navegable del sistema de operación para la cafetería **TomoMatcha**: punto de venta, comandas, inventario por receta, reportes, lealtad con QR, corte de caja y panel de configuración.

> **100 % demo.** Todos los datos son de ejemplo y viven en el navegador (`localStorage`). No hay pagos reales, cuentas, correos, ni conexiones con Mercado Pago, Google o WhatsApp. El cliente puede probar todo por su cuenta, sin credenciales.

## Cómo ejecutar

```bash
npm install
npm run dev      # http://localhost:3000
```

Validación:

```bash
npm run lint
npm run build
```

## Qué incluye la demo

| Módulo | Ruta | Acceso |
| --- | --- | --- |
| Inicio (dashboard del día) | `/inicio` | Administrador |
| Punto de venta | `/pos` | Ambos perfiles |
| Comandas (tablero de barra) | `/comandas` | Ambos perfiles |
| Inventario de insumos | `/inventario` | Administrador · flag |
| Productos y personalización | `/productos` | Administrador |
| Reportes | `/reportes` | Administrador |
| Clientes y lealtad (QR demo) | `/clientes` | Administrador · flag |
| Corte de caja | `/corte` | Administrador |
| Ajustes (feature flags) | `/ajustes` | Administrador |

Flujo completo conectado: al **cobrar** en el punto de venta se crea una comanda, se descuenta inventario según la **receta** del producto (incluida la leche elegida), se suman puntos de lealtad y se actualizan dashboard, reportes y corte de caja.

## Perfiles de la demo

Selector en la barra superior, sin contraseñas:

- **Administrador**: acceso a todos los módulos.
- **Empleado**: solo Punto de venta y Comandas; el resto muestra un aviso de acceso restringido.

## Feature flags (Ajustes)

Encienden/apagan módulos completos y persisten en el dispositivo:

- Inventario de insumos
- Lealtad y clientes
- Reseñas de Google (simuladas)
- Pagos con Mercado Pago (simulados)

Los módulos apagados muestran un aviso claro de "apagado por configuración".

## Datos de ejemplo y reinicio

- ~20 productos (matcha, café, té, bakery) con recetas, ~26 insumos, 8 clientes con puntos, ventas de los últimos 7 días y cortes de caja históricos.
- **Reiniciar demo** (menú lateral → Reiniciar, o Ajustes → Restablecer) regresa todo al estado inicial.
- No existen credenciales: nada que recordar ni configurar.

## Stack

- [Next.js](https://nextjs.org) 15 (App Router) + React 19 + TypeScript estricto
- Tailwind CSS 3 — sin librerías de gráficas ni dependencias pesadas (todas las visualizaciones son CSS/SVG propios)
- Estado central en React Context con persistencia versionada en `localStorage`

## Despliegue en Vercel

El proyecto es 100 % estático/cliente: no necesita variables de entorno, base de datos ni secretos.

1. Importar el repositorio en [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Next.js** (detección automática; sin configuración extra).
3. Deploy. Cada push a la rama despliega una nueva versión.

## Alcance y limitaciones (a propósito)

- Pagos con tarjeta/Mercado Pago: **simulados** (se marcan como tales en la interfaz).
- QR de lealtad y reseñas: **visuales de demostración**, no escaneables.
- Sin autenticación real, API, ni almacenamiento externo: todo es local al navegador.
- Pensada primero para iPad/POS y escritorio; también funciona en móvil.
