import {
  CreatePatientData,
  UpdatePatientData,
  PatientWithRelations,
  PatientWithHistory,
} from '../interfaces/patient-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IPatientRepository {
  create(data: CreatePatientData): Promise<PatientWithRelations>;
  findAllPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResult<PatientWithRelations>>;
  findById(id: number): Promise<PatientWithRelations | null>;
  findByIdWithHistory(id: number): Promise<PatientWithHistory | null>;
  update(id: number, data: UpdatePatientData): Promise<PatientWithRelations>;
  softDelete(id: number): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
  existsByDni(typeDocument: string, numberDocument: string): Promise<boolean>;
}
