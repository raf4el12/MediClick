import type { AppointmentStatus } from '@/views/appointments/types';
import { STATUS_META, type StatusColor } from '@/views/agenda/status';
import type { PatientRecordAppointment } from '../types';

export interface RecordTimelineItem {
  id: number;
  /** Día de la cita (`YYYY-MM-DD`), tomado del cupo. */
  date: string;
  /** Hora de inicio (`HH:mm`) en la zona de la sede. */
  time: string;
  status: string;
  statusLabel: string;
  statusColor: StatusColor;
  doctorName: string | null;
  reason: string | null;
  /** Notas clínicas con contenido; una nota vacía no aparece. */
  notes: { diagnosis: string | null; plan: string | null }[];
}

const statusOf = (status: string) =>
  STATUS_META[status as AppointmentStatus] ?? { label: status, color: 'secondary' as StatusColor };

/**
 * Citas del expediente como línea de tiempo, de la más reciente a la más antigua. `startTime` solo
 * guarda la hora (sobre 1970-01-01): el día sale de `schedule.scheduleDate`.
 */
export function toRecordTimeline(appointments: PatientRecordAppointment[]): RecordTimelineItem[] {
  return appointments
    .map((a) => {
      const doctor = a.schedule?.doctor;
      const { label, color } = statusOf(a.status);
      return {
        id: a.id,
        date: (a.schedule?.scheduleDate ?? '').slice(0, 10),
        time: a.startTime.slice(11, 16),
        status: a.status,
        statusLabel: label,
        statusColor: color,
        doctorName: doctor ? `${doctor.name} ${doctor.lastName}` : null,
        reason: a.reason || null,
        notes: (a.clinicalNotes ?? [])
          .map((n) => ({ diagnosis: n.diagnosis || null, plan: n.plan || null }))
          .filter((n) => n.diagnosis || n.plan),
      };
    })
    .sort((x, y) => `${y.date}T${y.time}`.localeCompare(`${x.date}T${x.time}`));
}
