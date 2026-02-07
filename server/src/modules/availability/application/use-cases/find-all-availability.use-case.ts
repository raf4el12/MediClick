import { Injectable, Inject } from '@nestjs/common';
import { AvailabilityResponseDto } from '../dto/availability-response.dto.js';
import { PaginatedAvailabilityResponseDto } from '../dto/paginated-availability-response.dto.js';
import type { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class FindAllAvailabilityUseCase {
  constructor(
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    doctorId?: number,
  ): Promise<PaginatedAvailabilityResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.availabilityRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      doctorId,
    );

    const rows: AvailabilityResponseDto[] = result.rows.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      specialtyId: a.specialtyId,
      startDate: a.startDate,
      endDate: a.endDate,
      dayOfWeek: a.dayOfWeek,
      timeFrom: dateToTimeString(a.timeFrom),
      timeTo: dateToTimeString(a.timeTo),
      isAvailable: a.isAvailable,
      type: a.type,
      reason: a.reason,
      doctor: {
        id: a.doctor.id,
        name: a.doctor.profile.name,
        lastName: a.doctor.profile.lastName,
      },
      specialty: a.specialty,
      createdAt: a.createdAt,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
