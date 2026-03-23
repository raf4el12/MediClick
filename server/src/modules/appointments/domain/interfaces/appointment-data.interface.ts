import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

export interface CreateAppointmentData {
  patientId: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  reason?: string;
  isOverbook?: boolean;
  clinicId?: number | null;
}

export interface UpdateAppointmentData {
  status?: AppointmentStatus;
  cancelReason?: string;
  cancellationFee?: number;
  scheduleId?: number;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
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
}
