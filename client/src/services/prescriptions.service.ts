import { api } from '@/libs/axios';
import type { Prescription, CreatePrescriptionPayload } from '@/views/prescriptions/types';

export const prescriptionsService = {
  create: async (payload: CreatePrescriptionPayload): Promise<Prescription> => {
    const response = await api.post<Prescription>('/prescriptions', payload);

    return response.data;
  },

  getByAppointment: async (appointmentId: number): Promise<Prescription> => {
    const response = await api.get<Prescription>(
      `/prescriptions/appointment/${appointmentId}`,
    );

    return response.data;
  },
};
