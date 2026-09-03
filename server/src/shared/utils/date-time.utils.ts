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

/**
 * Anticipación mínima para reservar un slot (2 horas). Compartida entre el
 * validador de citas y el listado de slots para que muestren la misma regla.
 */
export const MIN_BOOKING_ANTICIPATION_MS = 2 * 60 * 60 * 1000;

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
  return new Date(
    Date.UTC(1970, 0, 1, date.getUTCHours(), date.getUTCMinutes(), 0, 0),
  );
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
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
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
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Convierte una fecha de agenda (guardada como midnight UTC) y una hora (guardada
 * con base epoch 1970 UTC) en el instante UTC real correspondiente a la zona horaria IANA
 * de la sede.
 *
 * Utiliza formatToParts para calcular el offset respecto a UTC, realiza dos iteraciones
 * para ajustarse a cambios por horario de verano (DST) y valida que el instante resultante
 * coincida exactamente con la hora de reloj de pared solicitada.
 */
export function localDateAndTimeToInstant(
  scheduleDate: Date,
  timeOnly: Date,
  timezone: string,
): Date {
  const targetYear = scheduleDate.getUTCFullYear();
  const targetMonth = scheduleDate.getUTCMonth(); // 0-indexed
  const targetDay = scheduleDate.getUTCDate();

  const targetHour = timeOnly.getUTCHours();
  const targetMinute = timeOnly.getUTCMinutes();
  const targetSecond = timeOnly.getUTCSeconds();

  const targetWallMs = Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    targetHour,
    targetMinute,
    targetSecond,
  );

  let utcMs = targetWallMs;

  // Ajustar offset iterativamente (2 pasadas para converger ante transiciones DST)
  for (let i = 0; i < 2; i++) {
    const parts = tzParts(timezone, new Date(utcMs));
    const guessWallMs = Date.UTC(
      parts.year,
      parts.month,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const diff = guessWallMs - targetWallMs;
    utcMs -= diff;
  }

  // Validar que el instante resultante represente exactamente el reloj de pared solicitado
  const finalParts = tzParts(timezone, new Date(utcMs));
  if (
    finalParts.year !== targetYear ||
    finalParts.month !== targetMonth ||
    finalParts.day !== targetDay ||
    finalParts.hour !== targetHour ||
    finalParts.minute !== targetMinute ||
    finalParts.second !== targetSecond
  ) {
    throw new Error(
      `Hora local inexistente o inválida en la zona horaria ${timezone}: ` +
        `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')} ` +
        `${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}`,
    );
  }

  return new Date(utcMs);
}
