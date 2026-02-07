import { Injectable, Inject } from '@nestjs/common';
import { SpecialtyResponseDto } from '../dto/specialty-response.dto.js';
import { PaginatedSpecialtyResponseDto } from '../dto/paginated-specialty-response.dto.js';
import type { ISpecialtyRepository } from '../../domain/repositories/specialty.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

@Injectable()
export class FindAllSpecialtiesUseCase {
  constructor(
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    categoryId?: number,
  ): Promise<PaginatedSpecialtyResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.specialtyRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      categoryId,
    );

    const rows: SpecialtyResponseDto[] = result.rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price ? Number(s.price) : null,
      requirements: s.requirements,
      icon: s.icon,
      isActive: s.isActive,
      createdAt: s.createdAt,
      category: s.category,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
