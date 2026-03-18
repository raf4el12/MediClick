import { HolidayEntity } from '../entities/holiday.entity.js';
import {
  CreateHolidayData,
  UpdateHolidayData,
} from '../interfaces/holiday-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IHolidayRepository {
  create(data: CreateHolidayData): Promise<HolidayEntity>;
  createMany(data: CreateHolidayData[]): Promise<number>;
  findAllPaginated(
    params: PaginationParams,
    year?: number,
  ): Promise<PaginatedResult<HolidayEntity>>;
  findById(id: number): Promise<HolidayEntity | null>;
  findByDateRange(startDate: Date, endDate: Date): Promise<HolidayEntity[]>;
  findByYear(year: number): Promise<HolidayEntity[]>;
  isHoliday(date: Date, clinicId?: number): Promise<boolean>;
  findRecurring(): Promise<HolidayEntity[]>;
  findDistinctYears(): Promise<number[]>;
  deleteByNameAndYear(name: string, years: number[]): Promise<number>;
  update(id: number, data: UpdateHolidayData): Promise<HolidayEntity>;
  delete(id: number): Promise<void>;
  deleteByYear(year: number): Promise<number>;
}
