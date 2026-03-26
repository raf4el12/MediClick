const LOCALE = 'es-PE';

interface FormatDateOptions {
  month?: 'short' | 'long';
  weekday?: 'long' | 'short';
  time?: boolean;
  utc?: boolean;
}

/**
 * Formatea una fecha ISO para mostrar en la UI.
 * Por defecto usa timeZone: 'UTC' para evitar desfase de día con fechas
 * almacenadas como midnight UTC (scheduleDate, birthday, etc.).
 */
export function formatDate(
  dateStr: string | null | undefined,
  options: FormatDateOptions = {},
): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';

  const { month = 'short', weekday, time = false, utc = true } = options;

  const intlOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month,
    year: 'numeric',
    ...(weekday && { weekday }),
    ...(time && { hour: '2-digit', minute: '2-digit' }),
    ...(utc && { timeZone: 'UTC' }),
  };

  return date.toLocaleDateString(LOCALE, intlOptions);
}

/**
 * Formatea una fecha como tiempo relativo ("Hace 5 minutos", "Hace 2 horas").
 * Para fechas mayores a 7 días, muestra la fecha completa con hora.
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} minutos`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} horas`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Hace ${diffD} días`;

  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
