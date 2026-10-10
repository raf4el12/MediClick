import { describe, expect, it } from 'vitest';
import { AvailabilityType, DayOfWeek, type Availability } from '../types';
import { appointmentsOutsideRules, rulesToWeek, weekToEntries } from './weekRules';
import { AppointmentStatus } from '@/views/appointments/types';
import type { AgendaAppointment } from '@/views/agenda/types';

const row = (overrides: Partial<Availability>): Availability => ({
  id: 1,
  doctorId: 12,
  specialtyId: 2,
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  dayOfWeek: DayOfWeek.TUESDAY,
  timeFrom: '14:00',
  timeTo: '18:00',
  isAvailable: true,
  type: AvailabilityType.REGULAR,
  reason: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  doctor: { id: 12, profile: { name: 'Lucía', lastName: 'Paredes' } },
  specialty: { id: 2, name: 'Cardiología' },
  ...overrides,
});

describe('rulesToWeek', () => {
  it('toma solo las franjas de la especialidad, ordenadas por hora, con su vigencia', () => {
    const week = rulesToWeek(
      [
        row({ id: 1, timeFrom: '16:00', timeTo: '18:00' }),
        row({ id: 2, timeFrom: '08:00', timeTo: '12:00', type: AvailabilityType.EXTRA }),
        row({ id: 3, specialtyId: 1, dayOfWeek: DayOfWeek.MONDAY }),
        row({ id: 4, dayOfWeek: DayOfWeek.FRIDAY, isAvailable: false }),
      ],
      2,
    );

    expect(week.days.TUESDAY).toEqual([
      { start: '08:00', end: '12:00', type: 'EXTRA' },
      { start: '16:00', end: '18:00', type: 'REGULAR' },
    ]);
    expect(week.days.MONDAY).toEqual([]);
    expect(week.days.FRIDAY).toEqual([]);
    expect(week.validity).toEqual({ startDate: '2026-10-01', endDate: '2026-12-31' });
  });
});

describe('weekToEntries', () => {
  it('arma las entradas de bulk-save de lunes a domingo con la vigencia común', () => {
    const week = rulesToWeek([row({ dayOfWeek: DayOfWeek.THURSDAY, timeFrom: '08:00', timeTo: '14:00' }), row({})], 2);

    expect(weekToEntries(week)).toEqual([
      { startDate: '2026-10-01', endDate: '2026-12-31', dayOfWeek: 'TUESDAY', timeFrom: '14:00', timeTo: '18:00', type: 'REGULAR' },
      { startDate: '2026-10-01', endDate: '2026-12-31', dayOfWeek: 'THURSDAY', timeFrom: '08:00', timeTo: '14:00', type: 'REGULAR' },
    ]);
  });
});

describe('appointmentsOutsideRules', () => {
  // 2026-10-13 es martes, 2026-10-14 miércoles.
  const appt = (overrides: Partial<AgendaAppointment>): AgendaAppointment => ({
    id: 1,
    scheduleId: 40,
    doctorId: 12,
    specialtyId: 2,
    date: '2026-10-13',
    startTime: '15:00',
    endTime: '15:30',
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: 'PAID',
    isOverbook: false,
    isAtRisk: false,
    patient: { id: 100, fullName: 'Ana Torres' },
    ...overrides,
  });
  const week = rulesToWeek([row({})], 2); // martes 14:00–18:00, vigencia hasta el 31/12

  it('lista las citas próximas por atender de la especialidad que ninguna franja cubre', () => {
    const outside = appointmentsOutsideRules(
      [
        appt({ id: 1 }),
        appt({ id: 2, date: '2026-10-14' }),
        appt({ id: 3, startTime: '17:45', endTime: '18:15' }),
        appt({ id: 4, specialtyId: 1, date: '2026-10-14' }),
        appt({ id: 5, date: '2026-10-14', status: AppointmentStatus.CANCELLED }),
        appt({ id: 6, date: '2026-10-07' }),
        appt({ id: 7, date: '2027-01-05' }),
      ],
      2,
      week,
      '2026-10-10',
    ).map((a) => a.id);

    expect(outside).toEqual([2, 3, 7]);
  });
});
