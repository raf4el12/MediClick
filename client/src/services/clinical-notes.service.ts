import { api } from '@/libs/axios';
import type { ClinicalNote, CreateClinicalNotePayload } from '@/views/clinical-notes/types';

export const clinicalNotesService = {
  create: async (payload: CreateClinicalNotePayload): Promise<ClinicalNote> => {
    const response = await api.post<ClinicalNote>('/clinical-notes', payload);

    return response.data;
  },

  getByAppointment: async (appointmentId: number): Promise<ClinicalNote[]> => {
    const response = await api.get<ClinicalNote[]>(
      `/clinical-notes/appointment/${appointmentId}`,
    );

    return response.data;
  },
};
