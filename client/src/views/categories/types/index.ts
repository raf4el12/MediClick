export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
}
