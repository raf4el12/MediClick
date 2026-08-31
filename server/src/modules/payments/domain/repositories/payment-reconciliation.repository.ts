import type {
  PaymentMethodValue,
  PaymentStatusValue,
} from '../entities/transaction.entity.js';

export interface VerifiedPaymentSnapshot {
  appointmentId: number;
  gatewayId: string;
  externalRef: string;
  amount: number;
  currency: string;
  status: PaymentStatusValue;
  paymentMethod: PaymentMethodValue | null;
  payerEmail: string | null;
  failureReason: string | null;
  paidAt: Date | null;
  raw: unknown;
}

export interface PaymentReconciliationResult {
  appointmentId: number;
  appointmentStatus: string;
  paymentStatus: PaymentStatusValue;
  financialReviewRequired: boolean;
  notificationUserId: number | null;
  clinicId: number | null;
}

export interface IPaymentReconciliationRepository {
  reconcile(
    snapshot: VerifiedPaymentSnapshot,
  ): Promise<PaymentReconciliationResult | null>;
}
