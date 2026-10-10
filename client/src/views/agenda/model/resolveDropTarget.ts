import type { AgendaSnapshot, SlotTarget } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Cupo libre donde cae una cita arrastrada, o `null` si no se puede soltar ahí.
 * `start` viene de FullCalendar con `timeZone: 'UTC'`: sus campos UTC son la hora local de la sede.
 */
export function resolveDropTarget(agenda: AgendaSnapshot, appointmentId: number, start: Date): SlotTarget | null {
  const moved = agenda.appointments.find((a) => a.id === appointmentId);
  if (!moved) return null;

  const date = start.toISOString().slice(0, 10);
  const time = `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}`;
  const cupo = agenda.cupos.find(
    (c) =>
      c.available &&
      c.doctorId === moved.doctorId &&
      c.specialtyId === moved.specialtyId &&
      c.date === date &&
      c.startTime <= time &&
      time < c.endTime,
  );

  if (!cupo) return null;
  if (cupo.scheduleId === moved.scheduleId && cupo.startTime === moved.startTime) return null;

  return { scheduleId: cupo.scheduleId, startTime: cupo.startTime, endTime: cupo.endTime };
}
