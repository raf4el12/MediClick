import {
  CreateClinicalNoteData,
  ClinicalNoteWithAppointment,
} from '../interfaces/clinical-note-data.interface.js';

export interface IClinicalNoteRepository {
  create(data: CreateClinicalNoteData): Promise<ClinicalNoteWithAppointment>;
  findByAppointmentId(appointmentId: number): Promise<ClinicalNoteWithAppointment[]>;
  findAppointmentDoctorId(appointmentId: number): Promise<number | null>;
}
