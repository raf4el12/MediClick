import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type { Patient, CreatePatientPayload } from '@/views/patients/types';

export const patientsService = {
  findAllPaginated: async (
    params: PaginationParams,
  ): Promise<PaginatedResponse<Patient>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;
    if (params.isActive !== undefined) queryParams.isActive = String(params.isActive);

    const response = await api.get<PaginatedResponse<Patient>>(
      '/patients',
      { params: queryParams },
    );

    return response.data;
  },

  findById: async (id: number): Promise<Patient> => {
    const response = await api.get<Patient>(`/patients/${id}/history`);

    return response.data;
  },

  create: async (payload: CreatePatientPayload): Promise<Patient> => {
    const response = await api.post<Patient>('/patients', payload);

    return response.data;
  },
};
