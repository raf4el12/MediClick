import type { PatientRecord } from '../types/patient-record.types.js';

export type PatientRecordScope =
  | { kind: 'GLOBAL' }
  | { kind: 'PATIENT' }
  | { kind: 'CLINIC'; clinicId: number; doctorUserId?: number };

export interface IPatientRecordQueryPort {
  getPatientRecord(
    patientId: number,
    scope: PatientRecordScope,
  ): Promise<PatientRecord | null>;
  getPatientIdByUserId(userId: number): Promise<number | null>;
}
