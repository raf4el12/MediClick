import { CategoryEntity } from '../entities/category.entity.js';

export interface CreateCategoryData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
}

export interface ICategoryRepository {
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  findAll(): Promise<CategoryEntity[]>;
  findById(id: number): Promise<CategoryEntity | null>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcluding(name: string, excludeId: number): Promise<boolean>;
  update(id: number, data: UpdateCategoryData): Promise<CategoryEntity>;
  softDelete(id: number): Promise<void>;
}
