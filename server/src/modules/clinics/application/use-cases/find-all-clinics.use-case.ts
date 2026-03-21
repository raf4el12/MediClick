import { Injectable, Inject } from '@nestjs/common';
import { PaginatedClinicResponseDto } from '../dto/paginated-clinic-response.dto.js';
import type { IClinicRepository } from '../../domain/repositories/clinic.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

@Injectable()
export class FindAllClinicsUseCase {
  constructor(
    @Inject('IClinicRepository')
    private readonly clinicRepository: IClinicRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
  ): Promise<PaginatedClinicResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.clinicRepository.findAllPaginated({
      offset,
      limit,
      searchValue: pagination.searchValue,
      orderBy: pagination.orderBy,
      orderByMode: pagination.orderByMode,
    });

    return {
      totalRows: result.totalRows,
      rows: result.rows.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        phone: c.phone,
        email: c.email,
        timezone: c.timezone,
        currency: c.currency,
        isActive: c.isActive,
        createdAt: c.createdAt,
      })),
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
