import { toEntryDto, toOfferDto } from './waitlist-dto.mapper.js';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';
import type {
  WaitlistEntryWithRelations,
  WaitlistOfferWithEntry,
} from '../../domain/interfaces/waitlist-data.interface.js';

const entry = (
  overrides: Partial<WaitlistEntryWithRelations> = {},
): WaitlistEntryWithRelations => ({
  id: 5,
  patientId: 42,
  specialtyId: 3,
  doctorId: null,
  clinicId: 1,
  dateFrom: new Date('2026-10-20T00:00:00.000Z'),
  dateTo: new Date('2026-10-30T00:00:00.000Z'),
  timePreference: WaitlistTimePreference.MORNING,
  priority: 0,
  status: WaitlistEntryStatus.ACTIVE,
  waitUntil: null,
  notes: null,
  createdAt: new Date('2026-10-19T00:00:00.000Z'),
  updatedAt: null,
  fulfilledAt: null,
  patient: {
    id: 42,
    profile: {
      name: 'Ana',
      lastName: 'Torres',
      userId: 70,
      email: 'ana@test.local',
    },
  },
  specialty: { id: 3, name: 'Cardiología' },
  doctor: null,
  clinic: { id: 1, name: 'Sede Miraflores' },
  ...overrides,
});

const offer = (
  overrides: Partial<WaitlistOfferWithEntry> = {},
): WaitlistOfferWithEntry => ({
  id: 9,
  waitlistEntryId: 5,
  scheduleId: 12,
  startTime: new Date('1970-01-01T09:00:00.000Z'),
  endTime: new Date('1970-01-01T09:30:00.000Z'),
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  status: WaitlistOfferStatus.PENDING,
  acceptedAt: null,
  rejectedAt: null,
  createdAppointmentId: null,
  clinicId: 1,
  createdAt: new Date('2026-10-20T10:00:00.000Z'),
  entry: entry(),
  schedule: {
    scheduleDate: new Date('2026-10-22T00:00:00.000Z'),
    doctor: { profile: { name: 'Lucía', lastName: 'Paredes' } },
  },
  clinic: { id: 1, name: 'Sede Miraflores', timezone: 'America/Lima' },
  ...overrides,
});

describe('waitlist-dto.mapper', () => {
  it('la oferta dice para qué día, con qué médico y en qué sede, y conserva las horas HH:mm', () => {
    expect(toOfferDto(offer())).toMatchObject({
      scheduleDate: '2026-10-22',
      doctorName: 'Lucía Paredes',
      clinic: { id: 1, name: 'Sede Miraflores', timezone: 'America/Lima' },
      startTime: '09:00',
      endTime: '09:30',
    });
  });

  it('la entrada expone el nombre de su sede, o nulo si no tiene', () => {
    expect(toEntryDto(entry()).clinicName).toBe('Sede Miraflores');
    expect(
      toEntryDto(entry({ clinicId: null, clinic: null })).clinicName,
    ).toBeNull();
  });
});
