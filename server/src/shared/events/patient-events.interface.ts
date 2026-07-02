export const PATIENT_CREATED_EVENT = 'patient.created';
export const PATIENT_UPDATED_EVENT = 'patient.updated';
export const PATIENT_DELETED_EVENT = 'patient.deleted';

/** Evento delgado: los listeners de proyección re-leen la entidad por id. */
export interface PatientChangedEvent {
  patientId: number;
}
