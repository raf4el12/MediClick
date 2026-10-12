import { formatDate } from '@/utils/formatDate';
import { TIME_PREFERENCE_LABELS } from '../../functions/waitlist.schema';
import type { WaitlistEntry } from '../../types';

export interface WaitlistRow {
  id: number;
  /** Lugar en la cola, desde 1. */
  position: number;
  /** Médico preferido, o «Cualquiera». */
  doctor: string;
  /** Días entre los que el paciente puede atenderse. */
  window: string;
  /** Franja horaria preferida. */
  timeSlot: string;
  entry: WaitlistEntry;
}

/** Entradas en lista de espera → filas de la tabla, en el orden que manda el servidor (prioridad y llegada). */
export function toWaitlistRows(entries: WaitlistEntry[]): WaitlistRow[] {
  return entries.map((entry, i) => ({
    id: entry.id,
    position: i + 1,
    doctor: entry.doctorName ?? 'Cualquiera',
    window: `${formatDate(entry.dateFrom)} – ${formatDate(entry.dateTo)}`,
    timeSlot: TIME_PREFERENCE_LABELS[entry.timePreference],
    entry,
  }));
}
