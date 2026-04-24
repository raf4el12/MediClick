export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'PARTIAL'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'TRANSFER'
  | 'INSURANCE'
  | 'OTHER';

export interface PreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export interface PaymentResponse {
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
  createdAt: string;
}
