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

  getMyPrescription: async (appointmentId: number): Promise<Prescription> => {
    const response = await api.get<Prescription>(
      `/prescriptions/my/appointment/${appointmentId}`,
    );

    return response.data;
  },

  downloadPdf: async (appointmentId: number): Promise<void> => {
    const response = await api.get(
      `/prescriptions/appointment/${appointmentId}/pdf`,
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receta-${appointmentId}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  downloadMyPdf: async (appointmentId: number): Promise<void> => {
    const response = await api.get(
      `/prescriptions/my/appointment/${appointmentId}/pdf`,
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receta-${appointmentId}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};
