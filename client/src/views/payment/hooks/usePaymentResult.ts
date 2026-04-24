'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { paymentsService } from '@/services/payments.service';
import type { PaymentResponse } from '@/views/payment/types';

interface UsePaymentResultOptions {
  /** Re-fetch cada N ms. Útil en la página PENDING mientras MP procesa. */
  pollIntervalMs?: number;
}

interface UsePaymentResultState {
  /** ID de cita deducido del query param `external_reference`. */
  appointmentId: number | null;
  /** ID de pago de MP, solo informativo. */
  paymentId: string | null;
  payment: PaymentResponse | null;
  loading: boolean;
  error: string | null;
  retrying: boolean;
  retryError: string | null;
  refetch: () => Promise<void>;
  retryPayment: () => Promise<void>;
}

/**
 * Lee los query params que Mercado Pago añade al redirect
 * (`?payment_id=...&external_reference=...&status=...`) y consulta al backend
 * por el estado real del pago. En la página PENDING hace polling.
 * En la página FAILURE expone `retryPayment()` para re-generar una preference
 * y volver a redirigir al checkout.
 */
export function usePaymentResult(
  options: UsePaymentResultOptions = {},
): UsePaymentResultState {
  const searchParams = useSearchParams();
  const appointmentIdParam = searchParams.get('external_reference');
  const paymentId = searchParams.get('payment_id');

  const appointmentId = appointmentIdParam
    ? Number(appointmentIdParam)
    : null;

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!appointmentId || Number.isNaN(appointmentId)) {
      setLoading(false);
      setError('No se pudo identificar la cita asociada al pago.');
      return;
    }
    try {
      const data = await paymentsService.getByAppointment(appointmentId);
      setPayment(data);
      setError(null);
    } catch (err: unknown) {
      const { extractApiError } = await import('@/utils/extractApiError');
      const { message } = extractApiError(err, 'No se pudo consultar el pago.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!options.pollIntervalMs) return;
    if (payment && payment.status !== 'PENDING') return;

    const id = setInterval(() => {
      void refetch();
    }, options.pollIntervalMs);

    return () => clearInterval(id);
  }, [options.pollIntervalMs, payment, refetch]);

  const retryPayment = useCallback(async () => {
    if (!appointmentId) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const preference = await paymentsService.createPreference(appointmentId);
      window.location.href = preference.initPoint;
    } catch (err: unknown) {
      const { extractApiError } = await import('@/utils/extractApiError');
      const { message } = extractApiError(err, 'No se pudo reintentar el pago.');
      setRetryError(message);
      setRetrying(false);
    }
  }, [appointmentId]);

  return {
    appointmentId,
    paymentId,
    payment,
    loading,
    error,
    retrying,
    retryError,
    refetch,
    retryPayment,
  };
}
