import { Injectable, Inject } from '@nestjs/common';
import { ScheduleResponseDto } from '../dto/schedule-response.dto.js';
import { PaginatedScheduleResponseDto } from '../dto/paginated-schedule-response.dto.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class FindAllSchedulesUseCase {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    filters: {
      doctorId?: number;
      specialtyId?: number;
      dateFrom?: string;
      dateTo?: string;
      onlyAvailable?: boolean;
    },
  ): Promise<PaginatedScheduleResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.scheduleRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      {
        doctorId: filters.doctorId,
        specialtyId: filters.specialtyId,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        onlyAvailable: filters.onlyAvailable,
      },
    );

    const rows: ScheduleResponseDto[] = result.rows.map((s) => ({
      id: s.id,
      doctorId: s.doctorId,
      specialtyId: s.specialtyId,
      scheduleDate: s.scheduleDate,
      timeFrom: dateToTimeString(s.timeFrom),
      timeTo: dateToTimeString(s.timeTo),
      doctor: {
        id: s.doctor.id,
        name: s.doctor.profile.name,
        lastName: s.doctor.profile.lastName,
      },
      specialty: s.specialty,
      createdAt: s.createdAt,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
