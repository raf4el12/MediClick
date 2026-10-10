import { limaDay } from './booking-fixtures';
import { patientAppointment } from './patient-fixtures';

export const today = limaDay(0);

type Overrides = Record<string, unknown>;

/** Cita de `GET /agenda` del médico 200 (Gregorio Médico). */
export function agendaAppointment(overrides: Overrides = {}) {
  return {
    id: 1,
    scheduleId: 40,
    doctorId: 200,
    specialtyId: 2,
    date: today,
    startTime: '23:45',
    endTime: '23:59',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    isOverbook: false,
    isAtRisk: false,
    patient: { id: 101, fullName: 'Ana Torres' },
    ...overrides,
  };
}

export const cupo = (startTime: string, endTime: string, available: boolean, overrides: Overrides = {}) => ({
  scheduleId: 40,
  doctorId: 200,
  specialtyId: 2,
  date: today,
  startTime,
  endTime,
  available,
  ...overrides,
});

export function agendaSnapshot(overrides: Overrides = {}) {
  return {
    timezone: 'America/Lima',
    range: { from: today, to: today },
    doctors: [
      {
        id: 200,
        fullName: 'Gregorio Médico',
        specialties: [
          { id: 1, name: 'Medicina General' },
          { id: 2, name: 'Cardiología' },
        ],
      },
    ],
    cupos: [],
    appointments: [],
    blocks: [],
    holidays: [],
    indicators: {
      totalCupos: 0,
      bookedCupos: 0,
      occupancyRate: 0,
      byStatus: { PENDING: 0, CONFIRMED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 },
      atRisk: 0,
      pendingPayment: 0,
    },
    ...overrides,
  };
}

/**
 * Jornada de hoy: Bruno (confirmada, su hora ya pasó, en riesgo), Carla (en curso), Diego
 * (completada), Fernando (pendiente con pago pendiente) y Ana (confirmada, todavía no llega su hora).
 */
export const jornada = {
  bruno: agendaAppointment({ id: 2, specialtyId: 1, startTime: '00:00', endTime: '00:20', isAtRisk: true, patient: { id: 102, fullName: 'Bruno Salazar' } }),
  carla: agendaAppointment({ id: 3, specialtyId: 1, startTime: '00:20', endTime: '00:40', status: 'IN_PROGRESS', patient: { id: 103, fullName: 'Carla Gómez' } }),
  diego: agendaAppointment({ id: 4, specialtyId: 1, startTime: '00:40', endTime: '01:00', status: 'COMPLETED', patient: { id: 104, fullName: 'Diego Herrera' } }),
  fernando: agendaAppointment({ id: 5, startTime: '01:00', endTime: '01:30', status: 'PENDING', paymentStatus: 'PENDING', patient: { id: 105, fullName: 'Fernando Ríos' } }),
  ana: agendaAppointment(),
};

export const jornadaSnapshot = (overrides: Overrides = {}) =>
  agendaSnapshot({
    // Desordenadas a propósito: la jornada las ordena por hora.
    appointments: [jornada.ana, jornada.diego, jornada.bruno, jornada.fernando, jornada.carla],
    indicators: {
      totalCupos: 6,
      bookedCupos: 3,
      occupancyRate: 0.5,
      byStatus: { PENDING: 1, CONFIRMED: 2, IN_PROGRESS: 1, COMPLETED: 1, CANCELLED: 0, NO_SHOW: 0 },
      atRisk: 1,
      pendingPayment: 1,
    },
    ...overrides,
  });

/** `GET /appointments/doctor/today`: de aquí sale el motivo de la consulta. */
export const doctorDaily = () => [
  patientAppointment({ id: 3, reason: 'Fiebre y tos hace 3 días', status: 'IN_PROGRESS', patient: { id: 103, name: 'Carla', lastName: 'Gómez', email: 'carla@test.local' } }),
];

export const clinicalNote = (overrides: Overrides = {}) => ({
  id: 70,
  appointmentId: 3,
  summary: null,
  diagnosis: 'Faringitis aguda',
  plan: null,
  patient: { id: 103, name: 'Carla', lastName: 'Gómez' },
  scheduleDate: `${today}T00:00:00.000Z`,
  createdAt: '2026-10-10T05:30:00.000Z',
  ...overrides,
});
