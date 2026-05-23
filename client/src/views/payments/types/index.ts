import type { PaymentStatus, PaymentMethod } from '@/views/payment/types';
export type { PaymentStatus, PaymentMethod };

export interface Transaction {
  id: number;
  appointmentId: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  gatewayId: string | null;
  payerEmail: string | null;
  failureReason: string | null;
  paidAt: string | null;
  clinicId: number | null;
  createdAt: string;
}

export interface PaginatedPayments {
  data: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaymentQueryParams {
  status?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
