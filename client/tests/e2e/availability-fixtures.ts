import { limaDay } from './booking-fixtures';

export const today = limaDay(0);
const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
export const monday = limaDay(-weekday);
export const sunday = limaDay(6 - weekday);
/** Próximo día con ese índice (0 = lunes) a partir de mañana. */
export const next = (dayIndex: number) => limaDay(((dayIndex - weekday + 7) % 7) + 7);

type Overrides = Record<string, unknown>;

export const lucia = {
  id: 12,
  licenseNumber: 'CMP-1234',
  resume: null,
  ratingAvg: null,
  ratingCount: 0,
  clinicId: 1,
  clinic: { id: 1, name: 'Sede Central' },
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  profile: { id: 40, name: 'Lucía', lastName: 'Paredes', email: 'lucia@test.local', phone: null, gender: null },
  user: null,
  specialties: [
    { id: 1, name: 'Medicina General' },
    { id: 2, name: 'Cardiología' },
  ],
};

export const doctorsPage = { totalRows: 1, totalPages: 1, currentPage: 1, rows: [lucia] };

export function appointment(overrides: Overrides = {}) {
  return {
    id: 1,
    scheduleId: 40,
    doctorId: 12,
    specialtyId: 2,
    date: today,
    startTime: '08:00',
    endTime: '08:30',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    isOverbook: false,
    isAtRisk: false,
    patient: { id: 101, fullName: 'Ana Torres' },
    ...overrides,
  };
}

export const block = (overrides: Overrides = {}) => ({
  id: 7,
  doctorId: 12,
  type: 'TIME_RANGE',
  startDate: today,
  endDate: today,
  timeFrom: '10:00',
  timeTo: '11:00',
  reason: 'Reunión de servicio',
  ...overrides,
});

export function agenda(from: string, to: string, overrides: Overrides = {}) {
  return {
    timezone: 'America/Lima',
    range: { from, to },
    doctors: [{ id: 12, fullName: 'Lucía Paredes', specialties: lucia.specialties }],
    cupos: [
      { scheduleId: 40, doctorId: 12, specialtyId: 2, date: today, startTime: '08:00', endTime: '08:30', available: false },
      { scheduleId: 40, doctorId: 12, specialtyId: 2, date: today, startTime: '08:30', endTime: '09:00', available: true },
    ],
    appointments: [appointment()],
    blocks: [block()],
    holidays: [],
    indicators: {
      totalCupos: 12,
      bookedCupos: 5,
      occupancyRate: 5 / 12,
      byStatus: { PENDING: 0, CONFIRMED: 5, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 },
      atRisk: 0,
      pendingPayment: 0,
    },
    ...overrides,
  };
}

/** Regla de `GET /availability`. */
export const rule = (overrides: Overrides = {}) => ({
  id: 1,
  doctorId: 12,
  specialtyId: 2,
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  dayOfWeek: 'TUESDAY',
  timeFrom: '14:00',
  timeTo: '18:00',
  isAvailable: true,
  type: 'REGULAR',
  reason: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  doctor: { id: 12, profile: { name: 'Lucía', lastName: 'Paredes' } },
  specialty: { id: 2, name: 'Cardiología' },
  ...overrides,
});

export const rulesPage = (rows: unknown[]) => ({ totalRows: rows.length, totalPages: 1, currentPage: 1, rows });

/** Respuesta de la vista previa de impacto (UI-18, M1). */
export const impact = (appointments: unknown[] = []) => ({
  total: appointments.length,
  withPayment: appointments.filter((a) => ['PAID', 'PARTIAL'].includes((a as { paymentStatus: string }).paymentStatus)).length,
  appointments,
});

export const impactedAppointment = (overrides: Overrides = {}) => ({
  id: 1,
  doctorId: 12,
  doctorName: 'Lucía Paredes',
  specialtyName: 'Cardiología',
  date: today,
  startTime: '08:00',
  endTime: '08:30',
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  patient: { id: 101, fullName: 'Ana Torres' },
  ...overrides,
});

export const holiday = (overrides: Overrides = {}) => ({
  id: 3,
  name: 'Aniversario de la sede',
  date: '2026-10-16T00:00:00.000Z',
  year: 2026,
  isRecurring: false,
  isActive: true,
  clinicId: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});
