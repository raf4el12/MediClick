import { limaDay } from './booking-fixtures';

/** Cita del paciente tal como la devuelve `/appointments/my` (con su sede, UI-09). */
export function patientAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    patientId: 100,
    scheduleId: 10,
    startTime: '10:30',
    endTime: '11:00',
    reason: null,
    notes: null,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    amount: 150,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    patient: { id: 100, name: 'Ana', lastName: 'Paciente', email: 'ana.paciente@test.local' },
    schedule: {
      id: 10,
      scheduleDate: `${limaDay(1)}T00:00:00.000Z`,
      timeFrom: '08:00',
      timeTo: '13:00',
      doctor: { id: 1, name: 'Lucía', lastName: 'Paredes' },
      specialty: { id: 2, name: 'Cardiología' },
    },
    timezone: 'America/Lima',
    hasPrescription: false,
    notesCount: 0,
    createdAt: '2026-10-01T10:00:00.000Z',
    clinic: { id: 1, name: 'Sede Miraflores', address: 'Av. Larco 1150, Miraflores', currency: 'PEN' },
    ...overrides,
  };
}

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

/** Confirmada y pagada (mañana), pendiente con plazo, completada con receta y cancelada con reembolso. */
export const patientAppointments = {
  confirmed: patientAppointment(),
  pending: patientAppointment({
    id: 102,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    pendingUntil: minutesFromNow(12),
    startTime: '09:00',
    endTime: '09:30',
    schedule: { ...patientAppointment().schedule, scheduleDate: `${limaDay(3)}T00:00:00.000Z` },
  }),
  completed: patientAppointment({
    id: 106,
    status: 'COMPLETED',
    hasPrescription: true,
    schedule: { ...patientAppointment().schedule, scheduleDate: `${limaDay(-7)}T00:00:00.000Z`, specialty: { id: 1, name: 'Medicina General' } },
  }),
  cancelled: patientAppointment({
    id: 108,
    status: 'CANCELLED',
    paymentStatus: 'REFUNDED',
    cancellationFee: 40,
    schedule: { ...patientAppointment().schedule, scheduleDate: `${limaDay(-12)}T00:00:00.000Z` },
  }),
};

export const page = <T>(rows: T[]) => ({ totalRows: rows.length, totalPages: 1, currentPage: 1, rows });

export const summary = (overrides: Record<string, unknown> = {}) => ({
  nextAppointment: patientAppointments.confirmed,
  upcomingCount: 3,
  awaitingPaymentCount: 1,
  earliestPaymentDeadline: minutesFromNow(12),
  completedCount: 8,
  pendingReviewCount: 1,
  ...overrides,
});
