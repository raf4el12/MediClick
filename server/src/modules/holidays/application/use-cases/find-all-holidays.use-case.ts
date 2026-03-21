import { Injectable, Inject } from '@nestjs/common';
import { HolidayResponseDto } from '../dto/holiday-response.dto.js';
import { PaginatedHolidayResponseDto } from '../dto/paginated-holiday-response.dto.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

@Injectable()
export class FindAllHolidaysUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    year?: number,
    clinicId?: number | null,
  ): Promise<PaginatedHolidayResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.holidayRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      year,
      clinicId,
    );

    const rows: HolidayResponseDto[] = result.rows.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date,
      year: h.year,
      isRecurring: h.isRecurring,
      isActive: h.isActive,
      clinicId: h.clinicId,
      createdAt: h.createdAt,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
