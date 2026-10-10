import { AppointmentStatus } from '@/views/appointments/types';

export type StatusColor = 'warning' | 'success' | 'info' | 'primary' | 'secondary' | 'error';

/** Etiqueta y color de cada estado; el mismo color pinta la cita en `AppFullCalendar`. */
export const STATUS_META: Record<AppointmentStatus, { label: string; color: StatusColor }> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: 'warning' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: 'success' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En curso', color: 'info' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: 'primary' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: 'secondary' },
  [AppointmentStatus.NO_SHOW]: { label: 'Inasistencia', color: 'error' },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as AppointmentStatus[];
