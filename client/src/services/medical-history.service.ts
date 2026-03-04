import { api } from '@/libs/axios';
import type {
  MedicalHistory,
  PaginatedMedicalHistory,
  MedicalHistoryQueryParams,
  CreateMedicalHistoryPayload,
  UpdateMedicalHistoryPayload,
  MedicalHistoryStatus,
} from '@/views/medical-history/types';

export const medicalHistoryService = {
  getByPatient: async (
    patientId: number,
    params?: MedicalHistoryQueryParams,
  ): Promise<PaginatedMedicalHistory> => {
    const queryParams: Record<string, string | number> = {};

    if (params?.status) queryParams.status = params.status;
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;

    const response = await api.get<PaginatedMedicalHistory>(
      `/medical-history/patient/${patientId}`,
      { params: queryParams },
    );

    return response.data;
  },

  create: async (payload: CreateMedicalHistoryPayload): Promise<MedicalHistory> => {
    const response = await api.post<MedicalHistory>('/medical-history', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateMedicalHistoryPayload): Promise<MedicalHistory> => {
    const response = await api.patch<MedicalHistory>(`/medical-history/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number, status: MedicalHistoryStatus): Promise<MedicalHistory> => {
    const response = await api.patch<MedicalHistory>(`/medical-history/${id}/status`, { status });
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/medical-history/${id}`);
  },
};
