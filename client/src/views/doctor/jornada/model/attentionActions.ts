import { AppointmentStatus } from '@/views/appointments/types';

interface AttentionTarget {
  status: AppointmentStatus;
  date: string;
  startTime: string;
}

/** Reloj de pared de la sede: `YYYY-MM-DD` y `HH:mm`. */
export interface SedeNow {
  date: string;
  time: string;
}

/** Acciones del espacio de atención según el estado de la cita y la hora de la sede. */
export function attentionActions(appointment: AttentionTarget, now: SedeNow) {
  const confirmed = appointment.status === AppointmentStatus.CONFIRMED;
  const started = `${appointment.date}T${appointment.startTime}` <= `${now.date}T${now.time}`;

  return {
    checkIn: confirmed && appointment.date === now.date,
    // El servidor rechaza la inasistencia antes de la hora de inicio.
    noShow: confirmed && started,
    complete: appointment.status === AppointmentStatus.IN_PROGRESS,
    write: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED].includes(appointment.status),
  };
}
