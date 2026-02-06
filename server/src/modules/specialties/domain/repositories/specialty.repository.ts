import { SpecialtyEntity } from '../entities/specialty.entity.js';

export interface CreateSpecialtyData {
  categoryId: number;
  name: string;
  description?: string;
  duration: number;
  price: number;
  requirements?: string;
  icon?: string;
}

export interface UpdateSpecialtyData {
  categoryId?: number;
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  requirements?: string;
  icon?: string;
  isActive?: boolean;
}

export interface SpecialtyWithCategory extends SpecialtyEntity {
  category: { id: number; name: string };
}

export interface ISpecialtyRepository {
  create(data: CreateSpecialtyData): Promise<SpecialtyWithCategory>;
  findAll(): Promise<SpecialtyWithCategory[]>;
  findById(id: number): Promise<SpecialtyWithCategory | null>;
  findByIds(ids: number[]): Promise<SpecialtyEntity[]>;
  update(id: number, data: UpdateSpecialtyData): Promise<SpecialtyWithCategory>;
  softDelete(id: number): Promise<void>;
}
