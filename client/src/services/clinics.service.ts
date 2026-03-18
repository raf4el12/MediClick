import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Clinic,
  CreateClinicPayload,
  UpdateClinicPayload,
} from '@/views/clinics/types';

export const clinicsService = {
  findAll: async (): Promise<Clinic[]> => {
    const response = await api.get<PaginatedResponse<Clinic>>(
      '/clinics',
      { params: { pageSize: 100, currentPage: 1 } },
    );

    return response.data.rows;
  },

  findAllPaginated: async (
    params: PaginationParams,
  ): Promise<PaginatedResponse<Clinic>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;

    const response = await api.get<PaginatedResponse<Clinic>>(
      '/clinics',
      { params: queryParams },
    );

    return response.data;
  },

  create: async (payload: CreateClinicPayload): Promise<Clinic> => {
    const response = await api.post<Clinic>('/clinics', payload);

    return response.data;
  },

  update: async (
    id: number,
    payload: UpdateClinicPayload,
  ): Promise<Clinic> => {
    const response = await api.patch<Clinic>(
      `/clinics/${id}`,
      payload,
    );

    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/clinics/${id}`);
  },
};
