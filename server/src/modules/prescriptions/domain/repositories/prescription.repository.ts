import {
  CreatePrescriptionData,
  PrescriptionWithItems,
} from '../interfaces/prescription-data.interface.js';

export interface IPrescriptionRepository {
  createWithAutoComplete(data: CreatePrescriptionData): Promise<PrescriptionWithItems>;
  findByAppointmentId(appointmentId: number): Promise<PrescriptionWithItems | null>;
  findAppointmentDoctorId(appointmentId: number): Promise<number | null>;
}
