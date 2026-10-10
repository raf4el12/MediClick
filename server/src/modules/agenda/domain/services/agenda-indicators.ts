import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

/** Un cupo de la agenda: ocupado por una cita activa y/o anulado por un feriado o bloqueo. */
export interface IndicatorCupo {
  booked: boolean;
  annulled: boolean;
}

export interface IndicatorAppointment {
  status: AppointmentStatus;
  paymentStatus: string;
  isAtRisk: boolean;
  pendingUntil: Date | null;
}

export interface AgendaIndicators {
  totalCupos: number;
  bookedCupos: number;
  occupancyRate: number;
  byStatus: Record<AppointmentStatus, number>;
  atRisk: number;
  pendingPayment: number;
}

const AWAITING_ATTENTION = new Set<AppointmentStatus>([
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
]);

/**
 * Indicadores calculados sobre los mismos cupos y citas que devuelve la
 * agenda. La ocupación mide la capacidad ofrecida: un cupo anulado por un
 * feriado o un bloqueo no cuenta como ofrecido ni como ocupado.
 */
export function computeAgendaIndicators(
  cupos: IndicatorCupo[],
  appointments: IndicatorAppointment[],
  now: Date,
): AgendaIndicators {
  const offered = cupos.filter((cupo) => !cupo.annulled);
  const bookedCupos = offered.filter((cupo) => cupo.booked).length;

  const byStatus = Object.fromEntries(
    Object.values(AppointmentStatus).map((status) => [status, 0]),
  ) as Record<AppointmentStatus, number>;
  for (const appointment of appointments) byStatus[appointment.status] += 1;

  return {
    totalCupos: offered.length,
    bookedCupos,
    occupancyRate: offered.length ? bookedCupos / offered.length : 0,
    byStatus,
    atRisk: appointments.filter(
      (a) => a.isAtRisk && AWAITING_ATTENTION.has(a.status),
    ).length,
    // Las que todavía pueden pagarse (mismo criterio que el resumen del paciente).
    pendingPayment: appointments.filter(
      (a) =>
        a.status === AppointmentStatus.PENDING &&
        a.paymentStatus === 'PENDING' &&
        a.pendingUntil !== null &&
        a.pendingUntil > now,
    ).length,
  };
}
