/**
 * Utilidades centralizadas de fecha/hora para MediClick.
 *
 * CONVENCIÓN: Todos los DateTime tipo "hora" (timeFrom, timeTo, startTime, endTime)
 * se almacenan en la BD como UTC con fecha base 1970-01-01.
 * Ejemplo: "13:00" → 1970-01-01T13:00:00.000Z
 *
 * Para fechas reales (scheduleDate, holidays) se usan timestamps UTC del día.
 * Ejemplo: "2026-03-19" → 2026-03-19T00:00:00.000Z
 *
 * La zona horaria de Perú (UTC-5) SOLO se usa para obtener "ahora" en hora local
 * al validar anticipación mínima o fechas pasadas.
 */

// ── Conversión HH:mm ↔ Date UTC ──

/**
 * Convierte "HH:mm" → Date UTC con base 1970-01-01.
 * Ejemplo: "13:00" → 1970-01-01T13:00:00.000Z
 */
export function parseHHmm(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours ?? 0, minutes ?? 0, 0, 0));
}

/**
 * Convierte un Date → "HH:mm" leyendo horas/minutos en UTC.
 * Ejemplo: 1970-01-01T13:00:00.000Z → "13:00"
 */
export function dateToTimeString(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Alias de parseHHmm para módulos que usaban `timeStringToDate`.
 */
export const timeStringToDate = parseHHmm;

// ── Extracción de minutos ──

/**
 * Extrae minutos desde medianoche UTC. Ignora la fecha base.
 * Ejemplo: 1970-01-01T13:30:00Z → 810
 */
export function toMinutesUTC(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

// ── Normalización ──

/**
 * Normaliza cualquier Date a base 1970-01-01 UTC conservando solo HH:mm.
 * Útil cuando la BD tiene fechas base inconsistentes (2026-* vs 1970-01-01).
 */
export function normalizeToTimeOnly(date: Date): Date {
  return new Date(Date.UTC(1970, 0, 1, date.getUTCHours(), date.getUTCMinutes(), 0, 0));
}

// ── Comparación de rangos ──

/**
 * Verifica si dos rangos de tiempo se superponen comparando solo HH:mm UTC.
 * Ignora la fecha base para evitar falsos negativos.
 */
export function timeRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  const aS = toMinutesUTC(aStart);
  const aE = toMinutesUTC(aEnd);
  const bS = toMinutesUTC(bStart);
  const bE = toMinutesUTC(bEnd);
  return aS < bE && aE > bS;
}

// ── Rango de día UTC ──

/**
 * Calcula inicio y fin del día en UTC a partir de un Date.
 * Ejemplo: 2026-03-19T05:00:00Z → { start: 2026-03-19T00:00:00Z, end: 2026-03-20T00:00:00Z }
 */
export function utcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return { start, end };
}

// ── Hora actual paramétrica por timezone ──

/**
 * Extrae componentes de fecha/hora de un instante en la zona horaria indicada.
 * Usa Intl.DateTimeFormat.formatToParts — determinista e independiente del
 * TZ del servidor y de Date.parse.
 */
function tzParts(tz: string, date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  const hour = get('hour');
  return {
    year: get('year'),
    month: get('month') - 1, // 0-indexed para Date constructors
    day: get('day'),
    hour: hour === 24 ? 0 : hour, // midnight puede ser 24 en algunas implementaciones
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * Retorna la fecha/hora actual como "reloj de pared" en la zona horaria IANA
 * indicada. Los métodos locales del Date retornado (getFullYear, getHours, etc.)
 * devuelven los valores del reloj de pared en la zona solicitada.
 *
 * IMPORTANTE: El valor UTC interno no representa el instante real; usar solo
 * con accesores locales (getHours, getMinutes, etc.) para comparaciones
 * wall-clock, NUNCA para queries a base de datos — para eso usar
 * todayStartInTimezone().
 */
export function nowInTimezone(tz: string): Date {
  const { year, month, day, hour, minute, second } = tzParts(tz);
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Retorna el inicio del día actual en la zona horaria indicada como UTC midnight.
 * El Date resultante tiene getUTCFullYear/Month/Date correctos y es apto para
 * comparar contra fechas almacenadas en la BD (que usan convención midnight UTC).
 */
export function todayStartInTimezone(tz: string): Date {
  const { year, month, day } = tzParts(tz);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Normaliza un Date (schedule/appointment date) a midnight UTC del mismo día UTC.
 * Apto para comparar contra todayStartInTimezone() via getTime().
 */
export function scheduleDateToLocalDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
