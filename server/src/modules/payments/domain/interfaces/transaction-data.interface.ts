import type {
  PaymentMethodValue,
  PaymentStatusValue,
} from '../entities/transaction.entity.js';

export interface CreateTransactionData {
  appointmentId: number;
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethodValue | null;
  status: PaymentStatusValue;
  gatewayId?: string | null;
  preferenceId?: string | null;
  externalRef?: string | null;
  payerEmail?: string | null;
  metadata?: unknown;
  clinicId?: number | null;
}

export interface UpdateTransactionData {
  status?: PaymentStatusValue;
  paymentMethod?: PaymentMethodValue | null;
  gatewayId?: string | null;
  payerEmail?: string | null;
  failureReason?: string | null;
  paidAt?: Date | null;
  metadata?: unknown;
}
