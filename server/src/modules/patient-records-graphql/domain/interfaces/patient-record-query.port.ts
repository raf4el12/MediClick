import type { PatientRecord } from '../types/patient-record.types.js';

export interface IPatientRecordQueryPort {
  getPatientRecord(patientId: number): Promise<PatientRecord | null>;
  getPatientIdByUserId(userId: number): Promise<number | null>;
}
