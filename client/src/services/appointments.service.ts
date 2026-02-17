import { api } from '@/libs/axios';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Appointment,
  CreateAppointmentPayload,
  CancelAppointmentPayload,
  RescheduleAppointmentPayload,
  AppointmentFilters,
} from '@/views/appointments/types';

export const appointmentsService = {
  findAllPaginated: async (
    params: PaginationParams,
    filters?: AppointmentFilters,
  ): Promise<PaginatedResponse<Appointment>> => {
    const queryParams: Record<string, string | number> = {};

    if (params.searchValue) queryParams.searchValue = params.searchValue;
    if (params.currentPage) queryParams.currentPage = params.currentPage;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.orderByMode) queryParams.orderByMode = params.orderByMode;
    if (filters?.dateFrom) queryParams.dateFrom = filters.dateFrom;
    if (filters?.dateTo) queryParams.dateTo = filters.dateTo;
    if (filters?.doctorId) queryParams.doctorId = filters.doctorId;
    if (filters?.specialtyId) queryParams.specialtyId = filters.specialtyId;
    if (filters?.status) queryParams.status = filters.status;

    const response = await api.get<PaginatedResponse<Appointment>>(
      '/appointments',
      { params: queryParams },
    );

    return response.data;
  },

  create: async (payload: CreateAppointmentPayload): Promise<Appointment> => {
    const response = await api.post<Appointment>('/appointments', payload);

    return response.data;
  },

  checkIn: async (id: number): Promise<Appointment> => {
    const response = await api.patch<Appointment>(
      `/appointments/${id}/check-in`,
    );

    return response.data;
  },

  cancel: async (
    id: number,
    payload: CancelAppointmentPayload,
  ): Promise<Appointment> => {
    const response = await api.patch<Appointment>(
      `/appointments/${id}/cancel`,
      payload,
    );

    return response.data;
  },

  reschedule: async (
    id: number,
    payload: RescheduleAppointmentPayload,
  ): Promise<Appointment> => {
    const response = await api.patch<Appointment>(
      `/appointments/${id}/reschedule`,
      payload,
    );

    return response.data;
  },

  complete: async (id: number): Promise<Appointment> => {
    const response = await api.patch<Appointment>(
      `/appointments/${id}/complete`,
    );

    return response.data;
  },
};
