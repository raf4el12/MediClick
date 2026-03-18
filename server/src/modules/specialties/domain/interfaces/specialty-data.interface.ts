import { SpecialtyEntity } from '../entities/specialty.entity.js';

export interface CreateSpecialtyData {
  categoryId: number;
  name: string;
  description?: string;
  duration: number;
  bufferMinutes?: number;
  price: number;
  requirements?: string;
  icon?: string;
  clinicId?: number | null;
}

export interface UpdateSpecialtyData {
  categoryId?: number;
  name?: string;
  description?: string;
  duration?: number;
  bufferMinutes?: number;
  price?: number;
  requirements?: string;
  icon?: string;
  clinicId?: number | null;
  isActive?: boolean;
}

export interface SpecialtyWithCategory extends SpecialtyEntity {
  category: { id: number; name: string };
}
