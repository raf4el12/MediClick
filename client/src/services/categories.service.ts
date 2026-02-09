import { api } from '@/libs/axios';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Category } from '@/views/specialties/types';

export const categoriesService = {
  findAll: async (): Promise<Category[]> => {
    const response = await api.get<PaginatedResponse<Category>>(
      '/categories',
      { params: { pageSize: 100, currentPage: 1 } },
    );

    return response.data.rows;
  },
};
