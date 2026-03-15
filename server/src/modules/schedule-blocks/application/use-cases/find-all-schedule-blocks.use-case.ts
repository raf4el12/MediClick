import { Injectable, Inject } from '@nestjs/common';
import { ScheduleBlockResponseDto } from '../dto/schedule-block-response.dto.js';
import { PaginatedScheduleBlockResponseDto } from '../dto/paginated-schedule-block-response.dto.js';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

function dateToTimeString(date: Date | null): string | null {
  if (!date) return null;
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class FindAllScheduleBlocksUseCase {
  constructor(
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    doctorId?: number,
  ): Promise<PaginatedScheduleBlockResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.scheduleBlockRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      doctorId,
    );

    const rows: ScheduleBlockResponseDto[] = result.rows.map((block) => ({
      id: block.id,
      doctorId: block.doctorId,
      type: block.type,
      startDate: block.startDate,
      endDate: block.endDate,
      timeFrom: dateToTimeString(block.timeFrom),
      timeTo: dateToTimeString(block.timeTo),
      reason: block.reason,
      isActive: block.isActive,
      createdAt: block.createdAt,
      doctor: {
        id: block.doctor.id,
        name: block.doctor.profile.name,
        lastName: block.doctor.profile.lastName,
      },
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
