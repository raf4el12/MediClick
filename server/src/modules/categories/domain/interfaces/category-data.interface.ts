export interface CreateCategoryData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  clinicId?: number | null;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  clinicId?: number | null;
  isActive?: boolean;
}
