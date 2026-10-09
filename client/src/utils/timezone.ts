/**
 * Utilidades de zona horaria para el frontend.
 *
 * Usa Intl.DateTimeFormat.formatToParts para obtener componentes de fecha/hora
 * en cualquier zona IANA, independiente del timezone del navegador.
 *
 * Misma lógica que server/src/shared/utils/date-time.utils.ts (tzParts).
 */

const DEFAULT_TZ = 'America/Lima';

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
    month: get('month') - 1,
    day: get('day'),
    hour: hour === 24 ? 0 : hour,
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * Retorna un Date cuyo .getHours()/.getMinutes() reflejan el reloj de pared
 * en la zona horaria indicada. Usar SOLO para comparaciones wall-clock
 * (filtrar slots pasados, validar buffers), NUNCA para enviar a APIs.
 */
export function nowInTimezone(tz: string = DEFAULT_TZ): Date {
  const { year, month, day, hour, minute, second } = tzParts(tz);
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Retorna la fecha actual en la zona horaria indicada como 'YYYY-MM-DD'.
 * Apto para pasar como parámetro `dateFrom` a la API de schedules.
 */
export function getTodayInTimezone(tz: string = DEFAULT_TZ): string {
  const { year, month, day } = tzParts(tz);
  const m = (month + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Instante real (UTC) de un día `YYYY-MM-DD` y una hora `HH:mm` de la zona de
 * una sede, independiente de la zona del navegador.
 */
export function localToInstant(isoDay: string, time: string, tz: string): Date {
  const [y, m, d] = isoDay.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const wallMs = Date.UTC(y, m - 1, d, hh, mm);
  // Dos pasadas para ajustar el desfase en los cambios de horario.
  let guess = wallMs;
  for (let i = 0; i < 2; i += 1) {
    const p = tzParts(tz, new Date(guess));
    const shownMs = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second);
    guess += wallMs - shownMs;
  }
  return new Date(guess);
}
