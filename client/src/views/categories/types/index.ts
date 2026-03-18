export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number | null;
  clinicId: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  clinicId?: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  clinicId?: number;
  isActive?: boolean;
}
