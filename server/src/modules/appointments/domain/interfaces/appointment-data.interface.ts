import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

export interface CreateAppointmentData {
  patientId: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  reason?: string;
  isOverbook?: boolean;
  clinicId?: number | null;
  amount?: number | null;
  depositAmount?: number | null;
  pendingUntil?: Date | null;
}

export interface UpdateAppointmentData {
  status?: AppointmentStatus;
  cancelReason?: string | null;
  cancellationFee?: number;
  scheduleId?: number;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
  pendingUntil?: Date | null;
  reminderSent?: boolean;
  confirmedAt?: Date | null;
  checkedInAt?: Date | null;
  isAtRisk?: boolean;
  depositAmount?: number | null;
  updatedAt?: Date;
}

export interface AppointmentWithRelations {
  id: number;
  patientId: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  paymentStatus: string;
  amount: number | null;
  depositAmount?: number | null;
  cancelReason: string | null;
  cancellationFee: number | null;
  isOverbook: boolean;
  pendingUntil: Date | null;
  confirmedAt?: Date | null;
  checkedInAt?: Date | null;
  isAtRisk?: boolean;
  clinicId: number | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  hasPrescription: boolean;
  notesCount: number;
  patient: {
    id: number;
    profile: {
      name: string;
      lastName: string;
      email: string;
      userId: number | null;
    };
  };
  schedule: {
    id: number;
    scheduleDate: Date;
    timeFrom: Date;
    timeTo: Date;
    doctor: {
      id: number;
      profile: { name: string; lastName: string; userId?: number | null };
      clinic: {
        id?: number;
        name: string;
        timezone: string;
        defaultCancellationWindowHours?: number;
        noShowPenaltyPercentage?: number;
        address?: string | null;
        currency?: string;
      } | null;
    };
    specialty: { id: number; name: string };
  };
}

/** Datos del resumen del paciente: citas activas recientes y conteos históricos. */
export interface PatientSummarySource {
  /** Citas `PENDING`/`CONFIRMED` no eliminadas desde `fromDate`, de cualquier sede. */
  appointments: AppointmentWithRelations[];
  completedCount: number;
  /** Citas completadas sin reseña. */
  pendingReviewCount: number;
}

/** Slot liberado por una cita expirada (datos mínimos para la waitlist). */
export interface ExpiredAppointmentSlot {
  id: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  clinicId: number | null;
}

export interface DurableOperationIdentity {
  operationId: string;
  occurredAt: Date;
}

export interface RescheduleEventIdentity extends DurableOperationIdentity {
  slotReleasedEventId: string;
}

export interface AppointmentChangedEventIdentity extends DurableOperationIdentity {
  eventId: string;
}

export interface CancellationEventIdentity extends DurableOperationIdentity {
  cancelledEventId: string;
  slotReleasedEventId: string;
}

export interface CancelAppointmentAtomicallyData {
  appointmentId: number;
  reason: string | null;
  cancelledBy: string;
  cancellationFee?: number;
  eventIdentity: CancellationEventIdentity;
}

export interface CancelAppointmentAtomicallyResult {
  appointment: AppointmentWithRelations;
  refundReviewTransactionId: number | null;
  refundReviewTransactionIds?: number[];
  transitioned: boolean;
}

export interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  doctorId?: number;
  specialtyId?: number;
  status?: AppointmentStatus;
  clinicId?: number;
  isAtRisk?: boolean;
  patientId?: number;
}

export interface PatientAppointmentFilters {
  status?: AppointmentStatus;
  /** Varios estados a la vez (p. ej. canceladas e inasistencias). */
  statuses?: AppointmentStatus[];
}
