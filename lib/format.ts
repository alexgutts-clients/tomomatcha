/* ============================================================================
 * Formato de moneda, fechas y horas.
 *
 * El "día operativo" siempre se calcula en la zona horaria del negocio (no en
 * la del navegador): así el corte de caja de la barra en Ciudad de México no
 * cambia porque alguien abra el panel desde otro huso horario.
 * ========================================================================== */

export const DEFAULT_TZ = "America/Mexico_City";

const moneyCache = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, decimals: number): Intl.NumberFormat {
  const key = `${currency}:${decimals}`;
  let fmt = moneyCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    moneyCache.set(key, fmt);
  }
  return fmt;
}

export function money(value: number, currency = "MXN"): string {
  const safe = Number.isFinite(value) ? value : 0;
  return Number.isInteger(safe)
    ? moneyFormatter(currency, 0).format(safe)
    : moneyFormatter(currency, 2).format(safe);
}

export function shortDate(iso: string, tz = DEFAULT_TZ): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: tz,
  });
}

export function weekday(iso: string, tz = DEFAULT_TZ): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short",
    timeZone: tz,
  });
}

export function longDate(iso: string, tz = DEFAULT_TZ): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  });
}

export function time(iso: string, tz = DEFAULT_TZ): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

/**
 * Clave `YYYY-MM-DD` del día operativo al que pertenece un instante.
 * `en-CA` produce justamente ese formato con `Intl`.
 */
export function dayKey(iso: string | Date, tz = DEFAULT_TZ): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Zona horaria inválida en Ajustes: no rompemos la interfaz.
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

export function todayKey(tz = DEFAULT_TZ): string {
  return dayKey(new Date(), tz);
}

/** Las claves de los últimos `count` días operativos, del más viejo al más nuevo. */
export function lastDayKeys(count: number, tz = DEFAULT_TZ): string[] {
  const keys: string[] = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(now - i * 86_400_000), tz));
  }
  return keys;
}

export function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function unitLabel(qty: number, unit: string): string {
  const n = Math.round(qty * 100) / 100;
  return unit === "pza" ? `${n} pza` : `${n} ${unit}`;
}

/** Redondeo a dos decimales sin arrastrar el error binario de coma flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
