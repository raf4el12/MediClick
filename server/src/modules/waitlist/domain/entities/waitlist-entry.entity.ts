import { WaitlistTimePreference } from '../enums/waitlist-time-preference.enum.js';
import { WaitlistEntryStatus } from '../enums/waitlist-entry-status.enum.js';

export class WaitlistEntryEntity {
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
}
