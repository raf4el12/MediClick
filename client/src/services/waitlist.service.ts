import { api } from '@/libs/axios';
import type {
  WaitlistEntry,
  WaitlistOffer,
  JoinWaitlistPayload,
  AcceptOfferResponse,
} from '@/views/waitlist/types';

export const waitlistService = {
  getMyEntries: async (): Promise<WaitlistEntry[]> => {
    const response = await api.get<WaitlistEntry[]>('/waitlist/my');

    return response.data;
  },

  getMyOffers: async (): Promise<WaitlistOffer[]> => {
    const response = await api.get<WaitlistOffer[]>('/waitlist/my/offers');

    return response.data;
  },

  join: async (payload: JoinWaitlistPayload): Promise<WaitlistEntry> => {
    const response = await api.post<WaitlistEntry>('/waitlist', payload);

    return response.data;
  },

  leave: async (entryId: number): Promise<void> => {
    await api.delete(`/waitlist/${entryId}`);
  },

  acceptOffer: async (offerId: number): Promise<AcceptOfferResponse> => {
    const response = await api.post<AcceptOfferResponse>(
      `/waitlist/offers/${offerId}/accept`,
    );

    return response.data;
  },

  rejectOffer: async (offerId: number): Promise<void> => {
    await api.post(`/waitlist/offers/${offerId}/reject`);
  },

  // ── Staff (dashboard de la clínica) ──

  getClinicWaitlist: async (filters?: {
    specialtyId?: number;
    doctorId?: number;
  }): Promise<WaitlistEntry[]> => {
    const params: Record<string, number> = {};

    if (filters?.specialtyId) params.specialtyId = filters.specialtyId;
    if (filters?.doctorId) params.doctorId = filters.doctorId;

    const response = await api.get<WaitlistEntry[]>('/waitlist', { params });

    return response.data;
  },

  addPriority: async (entryId: number, delta: number): Promise<WaitlistEntry> => {
    const response = await api.patch<WaitlistEntry>(
      `/waitlist/${entryId}/priority`,
      { delta },
    );

    return response.data;
  },
};
