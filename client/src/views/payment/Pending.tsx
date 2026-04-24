'use client';

import { useEffect } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';
import { PaymentResultShell } from '@/views/payment/components/PaymentResultShell';
import { usePaymentResult } from '@/views/payment/hooks/usePaymentResult';

export default function PaymentPendingView() {
  const router = useRouter();
  const { payment, loading, refetch } = usePaymentResult({
    pollIntervalMs: 5000,
  });

  useEffect(() => {
    if (!payment) return;
    if (payment.status === 'PAID') {
      router.replace(`/payment/success?external_reference=${payment.appointmentId}`);
    } else if (payment.status === 'FAILED') {
      router.replace(`/payment/failure?external_reference=${payment.appointmentId}`);
    }
  }, [payment, router]);

  return (
    <PaymentResultShell
      color="warning"
      icon="ri-time-line"
      title="Procesando pago…"
      description="Mercado Pago está validando tu pago. Esta página se actualiza automáticamente; puedes cerrarla y te notificaremos cuando se confirme."
      body={<CircularProgress size={28} sx={{ my: 1 }} />}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={() => void refetch()}
            disabled={loading}
            startIcon={<i className="ri-refresh-line" />}
          >
            Actualizar
          </Button>
          <Button variant="text" onClick={() => router.push('/patient/appointments')}>
            Ir a mis citas
          </Button>
        </>
      }
    />
  );
}
