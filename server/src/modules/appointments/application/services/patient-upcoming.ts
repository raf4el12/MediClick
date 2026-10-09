import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { localDateAndTimeToInstant } from '../../../../shared/utils/date-time.utils.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

const ACTIVE = new Set<string>([
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
]);

/** Instante real de inicio: fecha de agenda y hora en la zona de la sede del médico. */
export const startInstant = (a: AppointmentWithRelations) =>
  localDateAndTimeToInstant(
    a.schedule.scheduleDate,
    a.startTime,
    a.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
  );

/**
 * Próximas citas del paciente: pendientes o confirmadas cuyo inicio, en la zona
 * de su sede, es posterior a `now`; ordenadas por ese instante entre todas las sedes.
 * La comparten el resumen y la pestaña "Próximas".
 */
export function upcomingAppointments(
  appointments: AppointmentWithRelations[],
  now: Date,
): AppointmentWithRelations[] {
  return appointments
    .filter((a) => ACTIVE.has(a.status))
    .map((a) => ({ a, at: startInstant(a) }))
    .filter(({ at }) => at > now)
    .sort((x, y) => x.at.getTime() - y.at.getTime())
    .map(({ a }) => a);
}

/** Desde el día UTC anterior: cubre "hoy" en cualquier zona; lo ya pasado se descarta por instante. */
export const upcomingFromDate = (now: Date) =>
  new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
