export type PaymentStatusValue =
  | 'PENDING'
  | 'PAID'
  | 'PARTIAL'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED';

export type PaymentMethodValue =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'TRANSFER'
  | 'INSURANCE'
  | 'OTHER';

export class TransactionEntity {
  id: number;
  appointmentId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodValue | null;
  status: PaymentStatusValue;
  gatewayId: string | null;
  preferenceId: string | null;
  externalRef: string | null;
  payerEmail: string | null;
  failureReason: string | null;
  paidAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date | null;
}
