import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Availability,
  CreateAvailabilityPayload,
  UpdateAvailabilityPayload,
} from '@/views/availability/types';

export const availabilityService = {
  findAllPaginated: async (
    params: PaginationParams,
    doctorId?: number,
  ): Promise<PaginatedResponse<Availability>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;
    if (doctorId) queryParams.doctorId = doctorId;

    const response = await api.get<PaginatedResponse<Availability>>(
      '/availability',
      { params: queryParams },
    );

    return response.data;
  },

  create: async (payload: CreateAvailabilityPayload): Promise<Availability> => {
    const response = await api.post<Availability>('/availability', payload);

    return response.data;
  },

  update: async (
    id: number,
    payload: UpdateAvailabilityPayload,
  ): Promise<Availability> => {
    const response = await api.patch<Availability>(
      `/availability/${id}`,
      payload,
    );

    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/availability/${id}`);
  },
};
