import { AvailabilityEntity } from '../entities/availability.entity.js';
import {
  CreateAvailabilityData,
  UpdateAvailabilityData,
  AvailabilityWithRelations,
} from '../interfaces/availability-data.interface.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IAvailabilityRepository {
  create(data: CreateAvailabilityData): Promise<AvailabilityWithRelations>;
  findAllPaginated(
    params: PaginationParams,
    doctorId?: number,
    clinicId?: number | null,
  ): Promise<PaginatedResult<AvailabilityWithRelations>>;
  findById(id: number): Promise<AvailabilityWithRelations | null>;
  findOverlapping(
    doctorId: number,
    dayOfWeek: DayOfWeek,
    timeFrom: Date,
    timeTo: Date,
    excludeId?: number,
    startDate?: Date | null,
    endDate?: Date | null,
  ): Promise<AvailabilityEntity[]>;
  findByDoctorAndDay(
    doctorId: number,
    dayOfWeek: DayOfWeek,
  ): Promise<AvailabilityEntity[]>;
  findActiveByDoctorIds(doctorIds: number[]): Promise<AvailabilityEntity[]>;
  update(
    id: number,
    data: UpdateAvailabilityData,
  ): Promise<AvailabilityWithRelations>;
  softDelete(id: number): Promise<void>;
  softDeleteByDoctor(doctorId: number): Promise<number>;
  existsDoctorSpecialty(
    doctorId: number,
    specialtyId: number,
  ): Promise<boolean>;
}
