import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, r2Endpoint, r2Status } from "./env";
import { ConfigError } from "./supabase";

/* ============================================================================
 * Cloudflare R2 · imágenes y media del negocio.
 *
 * R2 habla el protocolo de S3. Las subidas van directas del navegador al bucket
 * con una URL firmada, para que un archivo grande no tenga que pasar por el
 * servidor de Next.js (que tiene límite de tamaño de petición).
 *
 * Si R2 no está configurado, nada se rompe: la interfaz oculta la subida de
 * imágenes y muestra qué variables faltan.
 * ========================================================================== */

export const MEDIA_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const ALLOWED_MEDIA_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "video/mp4",
  "video/webm",
  "application/pdf",
] as const;

export type MediaPurpose = "producto" | "logo" | "general";

let s3: S3Client | null = null;

export function isR2Configured(): boolean {
  return r2Status().ok;
}

export function r2PublicBase(): string | null {
  return r2.publicBase;
}

export function r2Bucket(): string {
  return r2.bucket;
}

function client(): S3Client {
  const status = r2Status();
  const endpoint = r2Endpoint();
  if (!status.ok || !endpoint) {
    throw new ConfigError("Cloudflare R2", status.missing);
  }
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId!,
        secretAccessKey: r2.secretAccessKey!,
      },
      // R2 no soporta el checksum de flujo que el SDK activa por omisión.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return s3;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

/** Clave del objeto: sin datos del usuario, sin colisiones, ordenable por fecha. */
export function buildObjectKey(
  purpose: MediaPurpose,
  contentType: string,
  originalName?: string,
): string {
  const ext =
    EXT_BY_TYPE[contentType] ??
    originalName?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ??
    "bin";
  const stamp = new Date().toISOString().slice(0, 10);
  const random = crypto.randomUUID();
  return `${purpose}/${stamp}/${random}.${ext}`;
}

/**
 * Las claves llegan desde la base y desde la URL. Se validan siempre para que
 * nadie pueda salir del prefijo del bucket con `..` o rutas absolutas.
 */
export function isSafeObjectKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.startsWith("/") || key.includes("..")) return false;
  return /^[a-zA-Z0-9!_.*'()/-]+$/.test(key);
}

export async function presignUpload(
  key: string,
  contentType: string,
): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 600 },
  );
}

export async function presignDownload(
  key: string,
  seconds = 3600,
): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: r2Bucket(), Key: key }),
    { expiresIn: seconds },
  );
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }),
  );
}

export async function getObjectStream(key: string) {
  return client().send(
    new GetObjectCommand({ Bucket: r2Bucket(), Key: key }),
  );
}
