import {
  CreatePrescriptionData,
  PrescriptionForPdf,
  PrescriptionWithItems,
} from '../interfaces/prescription-data.interface.js';

export interface IPrescriptionRepository {
  createWithAutoComplete(
    data: CreatePrescriptionData,
  ): Promise<PrescriptionWithItems>;
  findByAppointmentId(
    appointmentId: number,
  ): Promise<PrescriptionWithItems | null>;
  findByAppointmentIdForPdf(
    appointmentId: number,
  ): Promise<PrescriptionForPdf | null>;
  findAppointmentDoctorId(appointmentId: number): Promise<number | null>;
}
