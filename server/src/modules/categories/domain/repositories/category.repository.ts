import { CategoryEntity } from '../entities/category.entity.js';
import {
  CreateCategoryData,
  UpdateCategoryData,
} from '../interfaces/category-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface ICategoryRepository {
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  findAllPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResult<CategoryEntity>>;
  findById(id: number): Promise<CategoryEntity | null>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcluding(name: string, excludeId: number): Promise<boolean>;
  update(id: number, data: UpdateCategoryData): Promise<CategoryEntity>;
  softDelete(id: number): Promise<void>;
}
