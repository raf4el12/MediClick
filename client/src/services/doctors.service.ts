import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type { Doctor, OnboardDoctorPayload } from '@/views/doctors/types';

export const doctorsService = {
  findAllPaginated: async (
    params: PaginationParams,
    specialtyId?: number,
  ): Promise<PaginatedResponse<Doctor>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;
    if (specialtyId) queryParams.specialtyId = specialtyId;

    const response = await api.get<PaginatedResponse<Doctor>>(
      '/doctors',
      { params: queryParams },
    );

    return response.data;
  },

  findById: async (id: number): Promise<Doctor> => {
    const response = await api.get<Doctor>(`/doctors/${id}`);

    return response.data;
  },

  onboard: async (payload: OnboardDoctorPayload): Promise<Doctor> => {
    const response = await api.post<Doctor>('/doctors/onboard', payload);

    return response.data;
  },
};
