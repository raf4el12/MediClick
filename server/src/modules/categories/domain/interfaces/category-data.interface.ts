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
