import type { Schedule } from '@/views/schedules/types';
import { nowInTimezone } from '@/utils/timezone';

/** Buffer mínimo en minutos antes de poder agendar */
const MIN_BUFFER_MINUTES = 120; // 2 horas

/**
 * Filtra horarios que ya no son agendables:
 * - Descarta fechas pasadas (antes de hoy)
 * - Si la fecha es hoy, descarta horarios cuyo inicio sea menor
 *   a la hora actual + buffer de 2 horas
 *
 * Usa la zona horaria IANA del doctor/clínica para las comparaciones.
 */
export function filterAvailableSlots(schedules: Schedule[], timezone: string): Schedule[] {
  const now = nowInTimezone(timezone);
  const todayStr = formatDateStr(now);

  return schedules.filter((slot) => {
    const slotDateStr = slot.scheduleDate.split('T')[0] ?? slot.scheduleDate;

    // Fecha pasada → descartar
    if (slotDateStr < todayStr) return false;

    // Si es hoy, validar hora con buffer
    if (slotDateStr === todayStr) {
      const [h, m] = slot.timeFrom.split(':').map(Number);
      const slotMinutes = (h ?? 0) * 60 + (m ?? 0);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

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
