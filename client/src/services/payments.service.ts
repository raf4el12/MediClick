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

  getByAppointment: async (appointmentId: number, paymentId?: string | null): Promise<PaymentResponse> => {
    const url = paymentId 
      ? `/payments/appointment/${appointmentId}?paymentId=${paymentId}`
      : `/payments/appointment/${appointmentId}`;
    const response = await api.get<PaymentResponse>(url);

    return response.data;
  },

  // Comprobantes: una transacción aprobada por pago (seña y saldo), en orden de pago
  getReceipts: async (appointmentId: number): Promise<PaymentResponse[]> => {
    const response = await api.get<PaymentResponse[]>(
      `/payments/appointment/${appointmentId}/receipts`,
    );

    return response.data;
  },

  listPayments: async (params?: PaymentQueryParams): Promise<PaginatedPayments> => {
    const response = await api.get<PaginatedPayments>('/payments', { params });
    return response.data;
  },
};
