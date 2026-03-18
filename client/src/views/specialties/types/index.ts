export interface SpecialtyCategory {
  id: number;
  name: string;
}

export interface Specialty {
  id: number;
  name: string;
  description: string | null;
  duration: number | null;
  price: number | null;
  requirements: string | null;
  icon: string | null;
  clinicId: number | null;
  isActive: boolean;
  createdAt: string;
  category: SpecialtyCategory;
}

export interface CreateSpecialtyPayload {
  categoryId: number;
  name: string;
  description?: string;
  duration: number;
  price: number;
  requirements?: string;
  icon?: string;
  clinicId?: number;
}

export interface UpdateSpecialtyPayload {
  categoryId?: number;
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  requirements?: string;
  icon?: string;
  clinicId?: number;
  isActive?: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}
