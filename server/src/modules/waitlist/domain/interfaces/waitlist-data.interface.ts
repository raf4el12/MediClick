import { WaitlistTimePreference } from '../enums/waitlist-time-preference.enum.js';
import { WaitlistEntryStatus } from '../enums/waitlist-entry-status.enum.js';
import { WaitlistOfferStatus } from '../enums/waitlist-offer-status.enum.js';

// ─────────────── WaitlistEntries ───────────────

export interface CreateWaitlistEntryData {
  patientId: number;
  specialtyId: number;
  doctorId?: number | null;
  clinicId?: number | null;
  dateFrom: Date;
  dateTo: Date;
  timePreference?: WaitlistTimePreference;
  priority?: number;
  waitUntil?: Date | null;
  notes?: string | null;
}

export interface UpdateWaitlistEntryData {
  status?: WaitlistEntryStatus;
  priority?: number;
  fulfilledAt?: Date | null;
  updatedAt?: Date;
}

export interface WaitlistEntryWithRelations {
  id: number;
  patientId: number;
  specialtyId: number;
  doctorId: number | null;
  clinicId: number | null;
  dateFrom: Date;
  dateTo: Date;
  timePreference: WaitlistTimePreference;
  priority: number;
  status: WaitlistEntryStatus;
  waitUntil: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  fulfilledAt: Date | null;
  patient: {
    id: number;
    profile: {
      name: string;
      lastName: string;
      userId: number | null;
      email: string | null;
    };
  };
  specialty: { id: number; name: string };
  doctor: { id: number; profile: { name: string; lastName: string } } | null;
}

/**
 * Criterios para encontrar el siguiente paciente en cola para un slot recién
 * liberado. El matcher los arma a partir del Schedule del slot.
 */
export interface WaitlistMatchCriteria {
  clinicId: number | null;
  specialtyId: number;
  doctorId: number;
  /** Día del slot liberado (medianoche UTC), comparado contra dateFrom/dateTo */
  scheduleDate: Date;
  /** Franjas aceptadas: [ANY, franja-del-slot] */
  timeBuckets: WaitlistTimePreference[];
  /** Slot concreto, usado para deduplicar contra ofertas previas del mismo slot */
  scheduleId: number;
  startTime: Date;
}

// ─────────────── WaitlistOffers ───────────────

export interface CreateWaitlistOfferData {
  waitlistEntryId: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  expiresAt: Date;
  clinicId?: number | null;
}

export interface WaitlistOfferWithEntry {
  id: number;
  waitlistEntryId: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  expiresAt: Date;
  status: WaitlistOfferStatus;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  createdAppointmentId: number | null;
  clinicId: number | null;
  createdAt: Date;
  entry: WaitlistEntryWithRelations;
}
