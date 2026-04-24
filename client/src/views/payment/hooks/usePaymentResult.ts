'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { paymentsService } from '@/services/payments.service';
import { extractApiError } from '@/utils/extractApiError';
import type { PaymentResponse } from '@/views/payment/types';

interface UsePaymentResultOptions {
  pollIntervalMs?: number;
}

interface UsePaymentResultState {
  appointmentId: number | null;
  payment: PaymentResponse | null;
  loading: boolean;
  error: string | null;
  retrying: boolean;
  retryError: string | null;
  refetch: () => Promise<void>;
  retryPayment: () => Promise<void>;
}

export function usePaymentResult(
  options: UsePaymentResultOptions = {},
): UsePaymentResultState {
  const searchParams = useSearchParams();
  const appointmentIdParam = searchParams.get('external_reference');

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
      const { message } = extractApiError(err, 'No se pudo consultar el pago.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const shouldPoll =
    options.pollIntervalMs != null &&
    (!payment || payment.status === 'PENDING');

  useEffect(() => {
    if (!shouldPoll || !options.pollIntervalMs) return;
    const id = setInterval(() => {
      void refetchRef.current();
    }, options.pollIntervalMs);
    return () => clearInterval(id);
  }, [shouldPoll, options.pollIntervalMs]);

  const retryPayment = useCallback(async () => {
    if (!appointmentId) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const preference = await paymentsService.createPreference(appointmentId);
      window.location.href = preference.initPoint;
    } catch (err: unknown) {
      const { message } = extractApiError(err, 'No se pudo reintentar el pago.');
      setRetryError(message);
      setRetrying(false);
    }
  }, [appointmentId]);

  return {
    appointmentId,
    payment,
    loading,
    error,
    retrying,
    retryError,
    refetch,
    retryPayment,
  };
}
