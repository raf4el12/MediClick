import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Specialty,
  CreateSpecialtyPayload,
  UpdateSpecialtyPayload,
} from '@/views/specialties/types';

export const specialtiesService = {
  findAllPaginated: async (
    params: PaginationParams,
    categoryId?: number,
  ): Promise<PaginatedResponse<Specialty>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;
    if (categoryId) queryParams.categoryId = categoryId;

    const response = await api.get<PaginatedResponse<Specialty>>(
      '/specialties',
      { params: queryParams },
    );

    return response.data;
  },

  create: async (payload: CreateSpecialtyPayload): Promise<Specialty> => {
    const response = await api.post<Specialty>('/specialties', payload);

    return response.data;
  },

  update: async (
    id: number,
    payload: UpdateSpecialtyPayload,
  ): Promise<Specialty> => {
    const response = await api.patch<Specialty>(
      `/specialties/${id}`,
      payload,
    );

    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/specialties/${id}`);
  },
};
