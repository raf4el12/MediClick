import { ClinicEntity } from '../entities/clinic.entity.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface CreateClinicData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
}

export interface UpdateClinicData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  isActive?: boolean;
}

export interface IClinicRepository {
  create(data: CreateClinicData): Promise<ClinicEntity>;
  findAllPaginated(params: PaginationParams): Promise<PaginatedResult<ClinicEntity>>;
  findById(id: number): Promise<ClinicEntity | null>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcluding(name: string, excludeId: number): Promise<boolean>;
  update(id: number, data: UpdateClinicData): Promise<ClinicEntity>;
  softDelete(id: number): Promise<void>;
  findTimezoneByDoctorId(doctorId: number): Promise<string | null>;
  findClinicIdByDoctorId(doctorId: number): Promise<number | null>;
}
