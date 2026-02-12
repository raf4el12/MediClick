import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/views/categories/types';

export const categoriesService = {
  findAll: async (): Promise<Category[]> => {
    const response = await api.get<PaginatedResponse<Category>>(
      '/categories',
      { params: { pageSize: 100, currentPage: 1 } },
    );

    return response.data.rows;
  },

  findAllPaginated: async (
    params: PaginationParams,
  ): Promise<PaginatedResponse<Category>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;

    const response = await api.get<PaginatedResponse<Category>>(
      '/categories',
      { params: queryParams },
    );

    return response.data;
  },

  create: async (payload: CreateCategoryPayload): Promise<Category> => {
    const response = await api.post<Category>('/categories', payload);

    return response.data;
  },

  update: async (
    id: number,
    payload: UpdateCategoryPayload,
  ): Promise<Category> => {
    const response = await api.patch<Category>(
      `/categories/${id}`,
      payload,
    );

    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
