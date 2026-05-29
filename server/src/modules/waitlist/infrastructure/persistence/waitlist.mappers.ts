import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';
import type {
  WaitlistEntryWithRelations,
  WaitlistOfferWithEntry,
} from '../../domain/interfaces/waitlist-data.interface.js';

/** Include compartido por los repos para hidratar la entrada con paciente/especialidad/doctor */
export const waitlistEntryInclude = {
  patient: {
    select: {
      id: true,
      profile: {
        select: {
          name: true,
          lastName: true,
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  },
  specialty: { select: { id: true, name: true } },
  doctor: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true } },
    },
  },
} as const;

export const waitlistOfferInclude = {
  entry: { include: waitlistEntryInclude },
} as const;

export function mapEntry(raw: any): WaitlistEntryWithRelations {
  return {
    id: raw.id,
    patientId: raw.patientId,
    specialtyId: raw.specialtyId,
    doctorId: raw.doctorId,
    clinicId: raw.clinicId,
    dateFrom: raw.dateFrom,
    dateTo: raw.dateTo,
    timePreference: raw.timePreference as WaitlistTimePreference,
    priority: raw.priority,
    status: raw.status as WaitlistEntryStatus,
    waitUntil: raw.waitUntil ?? null,
    notes: raw.notes ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
    fulfilledAt: raw.fulfilledAt ?? null,
    patient: {
      id: raw.patient.id,
      profile: {
        name: raw.patient.profile.name,
        lastName: raw.patient.profile.lastName,
        userId: raw.patient.profile.userId ?? null,
        email: raw.patient.profile.user?.email ?? null,
      },
    },
    specialty: raw.specialty,
    doctor: raw.doctor
      ? { id: raw.doctor.id, profile: raw.doctor.profile }
      : null,
  };
}

export function mapOffer(raw: any): WaitlistOfferWithEntry {
  return {
    id: raw.id,
    waitlistEntryId: raw.waitlistEntryId,
    scheduleId: raw.scheduleId,
    startTime: raw.startTime,
    endTime: raw.endTime,
    expiresAt: raw.expiresAt,
    status: raw.status as WaitlistOfferStatus,
    acceptedAt: raw.acceptedAt ?? null,
    rejectedAt: raw.rejectedAt ?? null,
    createdAppointmentId: raw.createdAppointmentId ?? null,
    clinicId: raw.clinicId ?? null,
    createdAt: raw.createdAt,
    entry: mapEntry(raw.entry),
  };
}
