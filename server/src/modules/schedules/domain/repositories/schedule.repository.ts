import {
  ScheduleWithRelations,
  CreateScheduleData,
} from '../interfaces/schedule-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IScheduleRepository {
  createMany(data: CreateScheduleData[]): Promise<number>;
  findAllPaginated(
    params: PaginationParams,
    filters: {
      doctorId?: number;
      specialtyId?: number;
      dateFrom?: Date;
      dateTo?: Date;
      onlyAvailable?: boolean;
    },
  ): Promise<PaginatedResult<ScheduleWithRelations>>;
  findById(id: number): Promise<ScheduleWithRelations | null>;
  existsSchedule(
    doctorId: number,
    scheduleDate: Date,
    timeFrom: Date,
    timeTo: Date,
  ): Promise<boolean>;
  findExistingDates(
    doctorId: number,
    dates: Date[],
  ): Promise<{ scheduleDate: Date; timeFrom: Date; timeTo: Date }[]>;
}
