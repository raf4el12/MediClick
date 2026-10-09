import type { AppointmentWithRelations } from '../../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../../shared/domain/enums/appointment-status.enum.js';

export const LIMA = 'America/Lima';

type Overrides = Partial<Omit<AppointmentWithRelations, 'schedule'>> & {
  date?: string;
  start?: string;
  timezone?: string;
};

/** Cita mínima: `date` es el día de agenda y `start` la hora local de la sede. */
export function appointment({
  date = '2026-10-20',
  start = '10:00',
  timezone = LIMA,
  ...rest
}: Overrides = {}) {
  return {
    id: 1,
    patientId: 7,
    scheduleId: 3,
    startTime: new Date(`1970-01-01T${start}:00.000Z`),
    endTime: new Date(`1970-01-01T${start}:00.000Z`),
    reason: null,
    notes: null,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: 'PAID',
    amount: 150,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    clinicId: 1,
    deleted: false,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: null,
    hasPrescription: false,
    notesCount: 0,
    patient: {
      id: 7,
      profile: {
        name: 'Ana',
        lastName: 'Torres',
        email: 'ana@test.local',
        userId: 70,
      },
    },
    schedule: {
      id: 3,
      scheduleDate: new Date(`${date}T00:00:00.000Z`),
      timeFrom: new Date('1970-01-01T08:00:00.000Z'),
      timeTo: new Date('1970-01-01T13:00:00.000Z'),
      doctor: {
        id: 4,
        profile: { name: 'Lucía', lastName: 'Paredes' },
        clinic: {
          id: 1,
          name: 'Sede Miraflores',
          timezone,
          address: 'Av. Larco 1150',
          currency: 'PEN',
        },
      },
      specialty: { id: 2, name: 'Cardiología' },
    },
    ...rest,
  } as AppointmentWithRelations;
}
