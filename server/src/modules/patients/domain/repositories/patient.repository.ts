import {
  CreatePatientData,
  UpdatePatientData,
  PatientWithRelations,
  PatientWithHistory,
} from '../interfaces/patient-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IPatientRepository {
  create(
    data: CreatePatientData,
    eventIdentity: PatientEventIdentity,
  ): Promise<PatientWithRelations>;
  findAllPaginated(
    params: PaginationParams & {
      isActive?: boolean;
      doctorId?: number;
      clinicId?: number;
    },
  ): Promise<
    PaginatedResult<PatientWithRelations> & {
      activeCount: number;
      inactiveCount: number;
    }
  >;
  findById(id: number): Promise<PatientWithRelations | null>;
  findByUserId(userId: number): Promise<PatientWithRelations | null>;
  findByIdWithHistory(id: number): Promise<PatientWithHistory | null>;
  update(
    id: number,
    data: UpdatePatientData,
    eventIdentity: PatientEventIdentity,
  ): Promise<PatientWithRelations>;
  softDelete(id: number, eventIdentity: PatientEventIdentity): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
  existsByDni(typeDocument: string, numberDocument: string): Promise<boolean>;

  /**
   * Verifica si un paciente tiene al menos una cita con el doctor dado.
   * Útil para validar acceso a datos médicos sensibles.
   */
  hasRelationWithDoctor(patientId: number, doctorId: number): Promise<boolean>;
}

export interface PatientEventIdentity {
  eventId: string;
  operationId: string;
  occurredAt: Date;
}
