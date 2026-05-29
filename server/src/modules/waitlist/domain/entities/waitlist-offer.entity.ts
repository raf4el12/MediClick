import { WaitlistOfferStatus } from '../enums/waitlist-offer-status.enum.js';

export class WaitlistOfferEntity {
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
}
