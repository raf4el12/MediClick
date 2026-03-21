import {
  CreateMedicalHistoryData,
  UpdateMedicalHistoryData,
  MedicalHistoryResult,
  MedicalHistoryFilters,
  PaginatedMedicalHistory,
} from '../interfaces/medical-history-data.interface.js';

export interface IMedicalHistoryRepository {
  create(data: CreateMedicalHistoryData): Promise<MedicalHistoryResult>;
  findByPatientId(
    patientId: number,
    filters: MedicalHistoryFilters,
  ): Promise<PaginatedMedicalHistory>;
  findById(id: number): Promise<MedicalHistoryResult | null>;
  update(
    id: number,
    data: UpdateMedicalHistoryData,
  ): Promise<MedicalHistoryResult>;
  updateStatus(id: number, status: string): Promise<MedicalHistoryResult>;
  softDelete(id: number): Promise<void>;
}
