// Moneda y fecha en la convención de cada sede (sin `S/` ni zona fijas).
const LOCALE_BY_CURRENCY: Record<string, string> = {
  PEN: 'es-PE',
  COP: 'es-CO',
  ARS: 'es-AR',
  CLP: 'es-CL',
  MXN: 'es-MX',
  USD: 'en-US',
};

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] ?? 'es', { style: 'currency', currency }).format(amount);
}

/** "lunes, 12 de octubre" para un día local `YYYY-MM-DD`. */
export function formatDay(isoDay: string): string {
  return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${isoDay}T12:00:00Z`),
  );
}
