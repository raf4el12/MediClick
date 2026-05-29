export enum WaitlistTimePreference {
  ANY = 'ANY',
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
}

export enum WaitlistEntryStatus {
  ACTIVE = 'ACTIVE',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum WaitlistOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface WaitlistEntry {
  id: number;
  patientId: number;
  patientName: string;
  specialtyId: number;
  specialtyName: string;
  doctorId: number | null;
  doctorName: string | null;
  dateFrom: string;
  dateTo: string;
  timePreference: WaitlistTimePreference;
  priority: number;
  status: WaitlistEntryStatus;
  waitUntil: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WaitlistOffer {
  id: number;
  waitlistEntryId: number;
  scheduleId: number;
  specialtyName: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
  status: WaitlistOfferStatus;
  secondsRemaining: number;
}

export interface JoinWaitlistPayload {
  specialtyId: number;
  doctorId?: number;
  dateFrom: string;
  dateTo: string;
  timePreference?: WaitlistTimePreference;
  notes?: string;
}

export interface AcceptOfferResponse {
  appointmentId: number;
  scheduleId: number;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  amount: number | null;
  pendingUntil: string | null;
}
