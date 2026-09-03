/**
 * Genera un identificador determinista de ventana lógica basado en epoch UTC.
 * Evita que múltiples réplicas se desincronicen o se solapen dentro de la misma ventana de cron.
 */
export function logicalWindowId(now: Date, windowMs: number): string {
  return String(Math.floor(now.getTime() / windowMs) * windowMs);
}
