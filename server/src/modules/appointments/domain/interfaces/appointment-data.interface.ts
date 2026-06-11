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
  pendingUntil?: Date | null;
}

export interface UpdateAppointmentData {
  status?: AppointmentStatus;
  cancelReason?: string;
  cancellationFee?: number;
  scheduleId?: number;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
  pendingUntil?: Date | null;
  reminderSent?: boolean;
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
  cancelReason: string | null;
  cancellationFee: number | null;
  isOverbook: boolean;
  pendingUntil: Date | null;
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
      profile: { name: string; lastName: string };
      clinic: { name: string; timezone: string } | null;
    };
    specialty: { id: number; name: string };
  };
}

/** Slot liberado por una cita expirada (datos mínimos para la waitlist). */
export interface ExpiredAppointmentSlot {
  id: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  clinicId: number | null;
}

export interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  doctorId?: number;
  specialtyId?: number;
  status?: AppointmentStatus;
  clinicId?: number;
}

export interface PatientAppointmentFilters {
  status?: AppointmentStatus;
  upcoming?: boolean;
  /** IANA timezone para calcular "hoy" al filtrar upcoming. Fallback: America/Lima */
  timezone?: string;
}
