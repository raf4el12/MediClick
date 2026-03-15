import { api } from '@/libs/axios';
import type {
  Holiday,
  CreateHolidayPayload,
  UpdateHolidayPayload,
  SeedHolidaysResponse,
} from '@/views/holidays/types';

interface PaginatedHolidays {
  totalRows: number;
  rows: Holiday[];
  totalPages: number;
  currentPage: number;
}

interface QueryParams {
  currentPage?: number;
  pageSize?: number;
  year?: number;
}

export const holidaysService = {
  findAll: async (params?: QueryParams): Promise<PaginatedHolidays> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.currentPage) queryParams.currentPage = params.currentPage;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.year) queryParams.year = params.year;

    const response = await api.get<PaginatedHolidays>('/holidays', { params: queryParams });
    return response.data;
  },

  create: async (payload: CreateHolidayPayload): Promise<Holiday> => {
    const response = await api.post<Holiday>('/holidays', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateHolidayPayload): Promise<Holiday> => {
    const response = await api.patch<Holiday>(`/holidays/${id}`, payload);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/holidays/${id}`);
  },

  seed: async (year: number): Promise<SeedHolidaysResponse> => {
    const response = await api.post<SeedHolidaysResponse>('/holidays/seed', { year });
    return response.data;
  },
};
