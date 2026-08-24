#!/usr/bin/env node
/* ============================================================================
 * npm run doctor · revisa las tres conexiones del sistema
 *
 * No modifica nada: sólo comprueba y reporta. Pensado para ejecutarlo después
 * de poner las variables de entorno y saber exactamente qué falta.
 *
 *   npm run doctor
 * ========================================================================== */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { S3Client, HeadBucketCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

/* --------------------------- Carga de variables ----------------------------- */

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined && process.env[key] !== "") continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

const env = (name) => {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : null;
};

/* ------------------------------- Presentación -------------------------------- */

const C = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
};

const results = [];

function report(service, status, detail, fix) {
  results.push({ service, status, detail, fix });
  const icon =
    status === "ok"
      ? `${C.green}✓${C.reset}`
      : status === "warn"
        ? `${C.yellow}!${C.reset}`
        : `${C.red}✗${C.reset}`;
  console.log(`${icon} ${C.bold}${service}${C.reset} · ${detail}`);
  if (fix) console.log(`  ${C.dim}→ ${fix}${C.reset}`);
}

console.log(`\n${C.bold}TomoMatcha · revisión de conexiones${C.reset}\n`);

/* --------------------------------- Supabase ---------------------------------- */

const supabaseUrl = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

const TABLES = [
  "staff",
  "settings",
  "ingredients",
  "milk_options",
  "extras",
  "extra_recipe_items",
  "products",
  "product_recipe_items",
  "customers",
  "orders",
  "order_items",
  "inventory_movements",
  "loyalty_transactions",
  "cash_closes",
  "media_assets",
];

async function checkSupabase() {
  if (!supabaseUrl || !serviceKey) {
    report(
      "Supabase",
      "fail",
      `faltan ${[!supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL", !serviceKey && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean).join(" y ")}`,
      "Panel de Supabase → Project Settings → API. Ver INSTRUCCIONES.md, paso 1.",
    );
    return;
  }

  // Que la llave y la URL sean del MISMO proyecto: es el error más fácil de
  // cometer al copiar credenciales de otro proyecto.
  const ref = /https:\/\/([a-z0-9]+)\.supabase\./.exec(supabaseUrl)?.[1];
  try {
    const payload = JSON.parse(
      Buffer.from(serviceKey.split(".")[1] ?? "", "base64url").toString("utf8"),
    );
    if (payload.ref && ref && payload.ref !== ref) {
      report(
        "Supabase",
        "fail",
        `la llave es del proyecto "${payload.ref}" pero la URL apunta a "${ref}"`,
        "Copia las dos credenciales del mismo proyecto.",
      );
      return;
    }
    if (payload.role && payload.role !== "service_role") {
      report(
        "Supabase",
        "fail",
        `SUPABASE_SERVICE_ROLE_KEY tiene el rol "${payload.role}", no "service_role"`,
        "En el panel, copia la llave marcada como service_role (secret).",
      );
      return;
    }
  } catch {
    // Las llaves nuevas (sb_secret_…) no son JWT: no hay nada que comparar.
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Ojo: con `head: true` PostgREST responde 204 sin error aunque la tabla no
  // exista, así que ese atajo daría un falso "todo bien". Con `limit(0)` sí
  // devuelve el error PGRST205.
  const missing = [];
  for (const table of TABLES) {
    const { error } = await db.from(table).select("*", { count: "exact" }).limit(0);
    if (error) missing.push(`${table}: ${error.message}`);
  }

  if (missing.length === TABLES.length) {
    report(
      "Supabase",
      "fail",
      "no se pudo leer ninguna tabla",
      `Primer error: ${missing[0]}. Si dice "does not exist", aplica supabase/migrations/. Si dice "Invalid API key", revisa la llave.`,
    );
    return;
  }
  if (missing.length) {
    report(
      "Supabase",
      "fail",
      `faltan ${missing.length} tablas`,
      `Aplica las migraciones de supabase/migrations/. Detalle: ${missing.join(", ")}`,
    );
    return;
  }

  const [{ count: products }, { count: staff }, { data: settings }] = await Promise.all([
    db.from("products").select("*", { count: "exact" }).limit(0),
    db.from("staff").select("*", { count: "exact" }).limit(0),
    db.from("settings").select("business_name, timezone").eq("id", 1).maybeSingle(),
  ]);

  report(
    "Supabase",
    "ok",
    `conectado · ${TABLES.length} tablas · ${products ?? 0} productos · ${staff ?? 0} usuarios · zona ${settings?.timezone ?? "?"}`,
  );

  // Las funciones transaccionales tienen que existir y ser invocables.
  // PostgREST resuelve las funciones por nombre de argumento: hay que pasarlos
  // aunque tengan valor por omisión.
  const { error: rpcError } = await db.rpc("business_day", {
    at: new Date().toISOString(),
  });
  if (rpcError) {
    report(
      "Supabase · funciones",
      "fail",
      `business_day() no responde: ${rpcError.message}`,
      "Aplica supabase/migrations/20260824000002_rpc.sql y las posteriores.",
    );
  } else {
    report("Supabase · funciones", "ok", "create_order, close_cash y compañía disponibles");
  }

  if (staff === 0) {
    report(
      "Supabase · equipo",
      "warn",
      "todavía no hay usuarios registrados",
      "El primer usuario que inicie sesión queda como administrador activo.",
    );
  }

  // Y la llave pública NO debe poder leer nada.
  const publicKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (publicKey) {
    const response = await fetch(`${supabaseUrl}/rest/v1/settings?select=id`, {
      headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` },
    });
    if (response.ok) {
      report(
        "Supabase · seguridad",
        "fail",
        "la llave pública puede leer la base de datos",
        "Vuelve a aplicar supabase/migrations/20260824000001_core_schema.sql y 20260824000004_harden_function_grants.sql.",
      );
    } else {
      report(
        "Supabase · seguridad",
        "ok",
        `la llave pública no tiene acceso (HTTP ${response.status}), como debe ser`,
      );
    }
  }
}

/* ----------------------------------- Clerk ----------------------------------- */

async function checkClerk() {
  const publishable = env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  const secret = env("CLERK_SECRET_KEY");

  if (!publishable || !secret) {
    report(
      "Clerk",
      "fail",
      `faltan ${[!publishable && "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", !secret && "CLERK_SECRET_KEY"].filter(Boolean).join(" y ")}`,
      "Panel de Clerk → API Keys. Ver INSTRUCCIONES.md, paso 2.",
    );
    return;
  }

  const pkEnv = publishable.startsWith("pk_live_") ? "producción" : "desarrollo";
  const skEnv = secret.startsWith("sk_live_") ? "producción" : "desarrollo";
  if (pkEnv !== skEnv) {
    report(
      "Clerk",
      "fail",
      `las llaves son de entornos distintos (publishable: ${pkEnv}, secret: ${skEnv})`,
      "Copia las dos del mismo entorno de la misma aplicación de Clerk.",
    );
    return;
  }

  try {
    const response = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!response.ok) {
      report(
        "Clerk",
        "fail",
        `la llave secreta fue rechazada (HTTP ${response.status})`,
        "Vuelve a copiarla del panel de Clerk → API Keys.",
      );
      return;
    }
    // El dominio del instance va codificado en la llave publishable.
    let instance = "";
    try {
      instance = Buffer.from(publishable.split("_")[2] ?? "", "base64")
        .toString("utf8")
        .replace(/\$$/, "");
    } catch {
      /* si no se puede decodificar, no pasa nada */
    }
    report(
      "Clerk",
      "ok",
      `conectado · entorno de ${pkEnv}${instance ? ` · ${instance}` : ""}`,
    );
    if (pkEnv === "desarrollo") {
      report(
        "Clerk · entorno",
        "warn",
        "estás usando llaves de desarrollo (pk_test / sk_test)",
        "Para el negocio en operación, crea la instancia de producción en Clerk y usa las llaves pk_live / sk_live.",
      );
    }
  } catch (error) {
    report(
      "Clerk",
      "fail",
      `no se pudo contactar la API: ${error.message}`,
      "Revisa la conexión de red o el proxy de salida.",
    );
  }
}

/* ------------------------------ Cloudflare R2 -------------------------------- */

async function checkR2() {
  const accountId = env("R2_ACCOUNT_ID");
  const endpointEnv = env("R2_ENDPOINT");
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
  const bucket = env("R2_BUCKET") ?? "tomomatcha-media";
  const publicBase = env("R2_PUBLIC_BASE_URL");

  const missing = [
    !accountId && !endpointEnv && "R2_ACCOUNT_ID",
    !accessKeyId && "R2_ACCESS_KEY_ID",
    !secretAccessKey && "R2_SECRET_ACCESS_KEY",
  ].filter(Boolean);

  if (missing.length) {
    report(
      "Cloudflare R2",
      "warn",
      `sin configurar (faltan ${missing.join(", ")})`,
      "La aplicación funciona igual, pero no se pueden subir fotos ni el logo. Ver INSTRUCCIONES.md, paso 3.",
    );
    return;
  }

  const endpoint = endpointEnv ?? `https://${accountId}.r2.cloudflarestorage.com`;
  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    report(
      "Cloudflare R2",
      "ok",
      `conectado · bucket "${bucket}"${publicBase ? ` · dominio público ${publicBase}` : " · sin dominio público (se sirve por la app)"}`,
    );
  } catch (error) {
    const code = error?.$metadata?.httpStatusCode;
    report(
      "Cloudflare R2",
      "fail",
      code === 404
        ? `el bucket "${bucket}" no existe en esta cuenta`
        : `no se pudo abrir el bucket (${error.name ?? "error"}${code ? ` ${code}` : ""})`,
      code === 404
        ? "Créalo en Cloudflare → R2, o corrige R2_BUCKET."
        : "Revisa R2_ACCOUNT_ID y el par de llaves del token de API.",
    );
    return;
  }

  // Sin CORS, el navegador no puede subir el archivo directo al bucket.
  try {
    const cors = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const rules = cors.CORSRules ?? [];
    const allowsPut = rules.some(
      (r) => (r.AllowedMethods ?? []).includes("PUT") && (r.AllowedOrigins ?? []).length > 0,
    );
    if (allowsPut) {
      const origins = rules.flatMap((r) => r.AllowedOrigins ?? []);
      report("Cloudflare R2 · CORS", "ok", `configurado para ${origins.join(", ")}`);
    } else {
      report(
        "Cloudflare R2 · CORS",
        "fail",
        "hay reglas de CORS pero ninguna permite PUT",
        "Ver INSTRUCCIONES.md, paso 3.4: la regla debe permitir el método PUT desde el dominio de la aplicación.",
      );
    }
  } catch {
    report(
      "Cloudflare R2 · CORS",
      "fail",
      "el bucket no tiene reglas de CORS",
      "Sin CORS el navegador no puede subir archivos. Ver INSTRUCCIONES.md, paso 3.4.",
    );
  }
}

/* ---------------------------------- Resumen ---------------------------------- */

await checkSupabase();
console.log("");
await checkClerk();
console.log("");
await checkR2();

const failures = results.filter((r) => r.status === "fail");
const warnings = results.filter((r) => r.status === "warn");

console.log("");
if (failures.length === 0) {
  console.log(
    `${C.green}${C.bold}Todo lo esencial está conectado.${C.reset}` +
      (warnings.length ? ` ${C.yellow}Hay ${warnings.length} aviso(s) arriba.${C.reset}` : ""),
  );
} else {
  console.log(
    `${C.red}${C.bold}Faltan ${failures.length} cosa(s) por resolver:${C.reset}`,
  );
  for (const f of failures) console.log(`  · ${f.service}: ${f.detail}`);
  console.log(`\n${C.dim}El paso a paso está en INSTRUCCIONES.md${C.reset}`);
}
console.log("");

process.exit(failures.length ? 1 : 0);
