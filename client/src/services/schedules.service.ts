import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Schedule,
  ScheduleFilters,
  GenerateSchedulesPayload,
  GenerateSchedulesResponse,
  TimeSlot,
  GetTimeSlotsParams,
} from '@/views/schedules/types';

export const schedulesService = {
  findAllPaginated: async (
    params: PaginationParams,
    filters?: ScheduleFilters,
  ): Promise<PaginatedResponse<Schedule>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;
    if (filters?.doctorId) queryParams.doctorId = filters.doctorId;
    if (filters?.specialtyId) queryParams.specialtyId = filters.specialtyId;
    if (filters?.dateFrom) queryParams.dateFrom = filters.dateFrom;
    if (filters?.dateTo) queryParams.dateTo = filters.dateTo;
    if (filters?.onlyAvailable) queryParams.onlyAvailable = 'true';

    const response = await api.get<PaginatedResponse<Schedule>>(
      '/schedules',
      { params: queryParams },
    );

    return response.data;
  },

  generate: async (
    payload: GenerateSchedulesPayload,
  ): Promise<GenerateSchedulesResponse> => {
    const response = await api.post<GenerateSchedulesResponse>(
      '/schedules/generate',
      payload,
    );

    return response.data;
  },

  /**
   * Obtiene todos los time slots (disponibles y ocupados) para un doctor
   * en una fecha y rango horario específico, fragmentados por durationMinutes.
   *
   * GET /schedules/time-slots
   */
  getTimeSlots: async (params: GetTimeSlotsParams): Promise<TimeSlot[]> => {
    const response = await api.get<TimeSlot[]>('/schedules/time-slots', {
      params: {
        doctorId: params.doctorId,
        ...(params.specialtyId && { specialtyId: params.specialtyId }),
        date: params.date,
        timeFrom: params.timeFrom,
        timeTo: params.timeTo,
        durationMinutes: params.durationMinutes,
      },
    });

    return response.data;
  },
};
