import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

export interface CreateAppointmentData {
  patientId: number;
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  reason?: string;
  isOverbook?: boolean;
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
  patient: {
    id: number;
    profile: { name: string; lastName: string; email: string };
  };
  schedule: {
    id: number;
    scheduleDate: Date;
    timeFrom: Date;
    timeTo: Date;
    doctor: {
      id: number;
      profile: { name: string; lastName: string };
      clinic: { timezone: string } | null;
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
}

export interface PatientAppointmentFilters {
  status?: AppointmentStatus;
  upcoming?: boolean;
}
