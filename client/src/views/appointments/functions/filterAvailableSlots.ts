import type { Schedule } from '@/views/schedules/types';

/** Buffer mínimo en minutos antes de poder agendar */
const MIN_BUFFER_MINUTES = 120; // 2 horas

/**
 * Filtra horarios que ya no son agendables:
 * - Descarta fechas pasadas (antes de hoy)
 * - Si la fecha es hoy, descarta horarios cuyo inicio sea menor
 *   a la hora actual + buffer de 2 horas
 *
 * Usa hora local de Perú (UTC-5) para las comparaciones.
 */
export function filterAvailableSlots(schedules: Schedule[]): Schedule[] {
  const nowPeru = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }),
  );
  const todayStr = formatDateStr(nowPeru);

  return schedules.filter((slot) => {
    const slotDateStr = slot.scheduleDate.split('T')[0] ?? slot.scheduleDate;

    // Fecha pasada → descartar
    if (slotDateStr < todayStr) return false;

    // Si es hoy, validar hora con buffer
    if (slotDateStr === todayStr) {
      const [h, m] = slot.timeFrom.split(':').map(Number);
      const slotMinutes = (h ?? 0) * 60 + (m ?? 0);
      const nowMinutes = nowPeru.getHours() * 60 + nowPeru.getMinutes();

      return slotMinutes - nowMinutes >= MIN_BUFFER_MINUTES;
    }

    // Fecha futura → válido
    return true;
  });
}

/** Formatea Date a 'YYYY-MM-DD' */
function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
