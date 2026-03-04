import {
  OnboardDoctorData,
  DoctorWithRelations,
} from '../interfaces/doctor-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IDoctorRepository {
  onboard(data: OnboardDoctorData): Promise<DoctorWithRelations>;
  findAllPaginated(
    params: PaginationParams,
    specialtyId?: number,
  ): Promise<PaginatedResult<DoctorWithRelations>>;
  findById(id: number): Promise<DoctorWithRelations | null>;
  existsByLicenseNumber(licenseNumber: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  findDoctorIdByUserId(userId: number): Promise<number | null>;
  update(
    id: number,
    data: {
      profile?: Record<string, unknown>;
      doctor?: Record<string, unknown>;
      specialtyIds?: number[];
    },
  ): Promise<DoctorWithRelations>;
  softDelete(id: number): Promise<void>;
}
