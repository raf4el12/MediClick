import { Injectable, Inject } from '@nestjs/common';
import { ScheduleBlockResponseDto } from '../dto/schedule-block-response.dto.js';
import { PaginatedScheduleBlockResponseDto } from '../dto/paginated-schedule-block-response.dto.js';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class FindAllScheduleBlocksUseCase {
  constructor(
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    doctorId?: number,
    clinicId?: number | null,
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
      clinicId,
    );

    const rows: ScheduleBlockResponseDto[] = result.rows.map((block) => ({
      id: block.id,
      doctorId: block.doctorId,
      type: block.type,
      startDate: block.startDate,
      endDate: block.endDate,
      timeFrom: block.timeFrom ? dateToTimeString(block.timeFrom) : null,
      timeTo: block.timeTo ? dateToTimeString(block.timeTo) : null,
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
