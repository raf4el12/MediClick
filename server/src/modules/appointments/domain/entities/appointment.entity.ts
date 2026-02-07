import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

export class AppointmentEntity {
  id: number;
  patientId: number;
  scheduleId: number;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  paymentStatus: string;
  amount: number | null;
  cancelReason: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
