import { Injectable, Inject } from '@nestjs/common';
import { CategoryResponseDto } from '../dto/category-response.dto.js';
import { PaginatedCategoryResponseDto } from '../dto/paginated-category-response.dto.js';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

@Injectable()
export class FindAllCategoriesUseCase {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
  ): Promise<PaginatedCategoryResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.categoryRepository.findAllPaginated({
      offset,
      limit,
      searchValue: pagination.searchValue,
      orderBy: pagination.orderBy,
      orderByMode: pagination.orderByMode,
    });

    const rows: CategoryResponseDto[] = result.rows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      order: c.order,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
