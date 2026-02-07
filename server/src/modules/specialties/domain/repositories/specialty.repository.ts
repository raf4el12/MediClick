import { SpecialtyEntity } from '../entities/specialty.entity.js';
import {
  CreateSpecialtyData,
  UpdateSpecialtyData,
  SpecialtyWithCategory,
} from '../interfaces/specialty-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface ISpecialtyRepository {
  create(data: CreateSpecialtyData): Promise<SpecialtyWithCategory>;
  findAllPaginated(
    params: PaginationParams,
    categoryId?: number,
  ): Promise<PaginatedResult<SpecialtyWithCategory>>;
  findById(id: number): Promise<SpecialtyWithCategory | null>;
  findByIds(ids: number[]): Promise<SpecialtyEntity[]>;
  update(id: number, data: UpdateSpecialtyData): Promise<SpecialtyWithCategory>;
  softDelete(id: number): Promise<void>;
}
