import { WaitlistTimePreference } from '../enums/waitlist-time-preference.enum.js';

/**
 * Mapea la hora de inicio de un slot a su franja horaria.
 * Los slots se almacenan como Date con la hora en UTC (igual que appointments),
 * por eso se usa getUTCHours().
 *
 * MORNING 06:00–11:59 · AFTERNOON 12:00–17:59 · EVENING 18:00–21:59.
 * Fuera de esos rangos cae en EVENING como franja más cercana de cierre.
 */
export function bucketOfStartTime(startTime: Date): WaitlistTimePreference {
  const hour = startTime.getUTCHours();
  if (hour >= 6 && hour < 12) return WaitlistTimePreference.MORNING;
  if (hour >= 12 && hour < 18) return WaitlistTimePreference.AFTERNOON;
  return WaitlistTimePreference.EVENING;
}

/**
 * Franjas que matchean un slot: ANY siempre, más la franja concreta del slot.
 * Se usa en el filtro `timePreference IN (...)` del matcher.
 */
export function matchingBuckets(startTime: Date): WaitlistTimePreference[] {
  return [WaitlistTimePreference.ANY, bucketOfStartTime(startTime)];
}
