/**
 * Eventos del dominio de lista de espera. Se emiten vía EventEmitter2 y los
 * consume el WaitlistNotificationListener (mail + notificación in-app).
 */

export interface WaitlistOfferCreatedEvent {
  offerId: number;
  waitlistEntryId: number;
  patientUserId: number | null;
  patientEmail: string | null;
  patientName: string;
  doctorName: string;
  specialtyName: string;
  clinicTimezone: string;
  scheduleDate: Date;
  startTime: Date;
  endTime: Date;
  expiresAt: Date;
  clinicId: number | null;
}

export interface WaitlistOfferAcceptedEvent {
  offerId: number;
  appointmentId: number;
  patientUserId: number | null;
  patientName: string;
  doctorName: string;
  clinicId: number | null;
}
