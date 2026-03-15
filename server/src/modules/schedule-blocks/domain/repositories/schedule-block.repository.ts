import { ScheduleBlockEntity } from '../entities/schedule-block.entity.js';
import {
  CreateScheduleBlockData,
  UpdateScheduleBlockData,
  ScheduleBlockWithDoctor,
} from '../interfaces/schedule-block-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IScheduleBlockRepository {
  create(data: CreateScheduleBlockData): Promise<ScheduleBlockWithDoctor>;

  findAllPaginated(
    params: PaginationParams,
    doctorId?: number,
  ): Promise<PaginatedResult<ScheduleBlockWithDoctor>>;

  findById(id: number): Promise<ScheduleBlockWithDoctor | null>;

  findActiveByDoctorAndDateRange(
    doctorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ScheduleBlockEntity[]>;

  isBlocked(
    doctorId: number,
    date: Date,
    timeFrom?: Date,
    timeTo?: Date,
  ): Promise<boolean>;

  update(
    id: number,
    data: UpdateScheduleBlockData,
  ): Promise<ScheduleBlockWithDoctor>;

  softDelete(id: number): Promise<void>;
}
