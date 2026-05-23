import { api } from '@/libs/axios';
import type {
  PreferenceResponse,
  PaymentResponse,
} from '@/views/payment/types';
import type { PaginatedPayments, PaymentQueryParams } from '@/views/payments/types';

export const paymentsService = {
  createPreference: async (appointmentId: number): Promise<PreferenceResponse> => {
    const response = await api.post<PreferenceResponse>(
      '/payments/preferences',
      { appointmentId },
    );

    return response.data;
  },

  getByAppointment: async (appointmentId: number): Promise<PaymentResponse> => {
    const response = await api.get<PaymentResponse>(
      `/payments/appointment/${appointmentId}`,
    );

    return response.data;
  },

  listPayments: async (params?: PaymentQueryParams): Promise<PaginatedPayments> => {
    const response = await api.get<PaginatedPayments>('/payments', { params });
    return response.data;
  },
};
