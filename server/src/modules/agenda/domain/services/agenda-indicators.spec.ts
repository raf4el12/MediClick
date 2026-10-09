import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import {
  computeAgendaIndicators,
  type IndicatorAppointment,
  type IndicatorCupo,
} from './agenda-indicators.js';

const NOW = new Date('2099-01-15T12:00:00.000Z');

const cupo = (overrides: Partial<IndicatorCupo> = {}): IndicatorCupo => ({
  booked: false,
  annulled: false,
  ...overrides,
});

const appointment = (
  overrides: Partial<IndicatorAppointment> = {},
): IndicatorAppointment => ({
  status: AppointmentStatus.CONFIRMED,
  paymentStatus: 'PAID',
  isAtRisk: false,
  pendingUntil: null,
  ...overrides,
});

describe('computeAgendaIndicators', () => {
  it('sin cupos ni citas la ocupación es 0 y todos los estados aparecen en 0', () => {
    expect(computeAgendaIndicators([], [], NOW)).toEqual({
      totalCupos: 0,
      bookedCupos: 0,
      occupancyRate: 0,
      byStatus: {
        PENDING: 0,
        CONFIRMED: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        NO_SHOW: 0,
      },
      atRisk: 0,
      pendingPayment: 0,
    });
  });

  it('la ocupación es cupos ocupados sobre cupos ofrecidos; los anulados por feriado o bloqueo no cuentan', () => {
    const result = computeAgendaIndicators(
      [
        cupo({ booked: true }),
        cupo(),
        cupo(),
        cupo({ booked: true }),
        cupo({ annulled: true }),
        cupo({ annulled: true, booked: true }),
      ],
      [],
      NOW,
    );

    expect(result.totalCupos).toBe(4);
    expect(result.bookedCupos).toBe(2);
    expect(result.occupancyRate).toBe(0.5);
  });

  it('cuenta las citas por estado asistencial, incluidas canceladas e inasistencias', () => {
    const { byStatus } = computeAgendaIndicators(
      [],
      [
        appointment({ status: AppointmentStatus.CONFIRMED }),
        appointment({ status: AppointmentStatus.CONFIRMED }),
        appointment({ status: AppointmentStatus.NO_SHOW }),
        appointment({ status: AppointmentStatus.CANCELLED }),
      ],
      NOW,
    );

    expect(byStatus).toMatchObject({
      CONFIRMED: 2,
      NO_SHOW: 1,
      CANCELLED: 1,
      PENDING: 0,
    });
  });

  it('en riesgo cuenta solo las citas por atender marcadas en riesgo', () => {
    const { atRisk } = computeAgendaIndicators(
      [],
      [
        appointment({ isAtRisk: true }),
        appointment({ isAtRisk: true, status: AppointmentStatus.PENDING }),
        appointment({ isAtRisk: true, status: AppointmentStatus.CANCELLED }),
        appointment({ isAtRisk: true, status: AppointmentStatus.COMPLETED }),
        appointment(),
      ],
      NOW,
    );

    expect(atRisk).toBe(2);
  });

  it('pago pendiente cuenta las citas pendientes con plazo de pago vigente', () => {
    const later = new Date(NOW.getTime() + 10 * 60_000);
    const earlier = new Date(NOW.getTime() - 60_000);
    const pending = {
      status: AppointmentStatus.PENDING,
      paymentStatus: 'PENDING',
    };

    const { pendingPayment } = computeAgendaIndicators(
      [],
      [
        appointment({ ...pending, pendingUntil: later }),
        appointment({ ...pending, pendingUntil: earlier }),
        appointment({ ...pending, pendingUntil: null }),
        appointment({
          status: AppointmentStatus.CONFIRMED,
          paymentStatus: 'PENDING',
          pendingUntil: later,
        }),
      ],
      NOW,
    );

    expect(pendingPayment).toBe(1);
  });
});
