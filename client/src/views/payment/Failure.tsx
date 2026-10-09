'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';
import { PaymentResultShell } from '@/views/payment/components/PaymentResultShell';
import { usePaymentResult } from '@/views/payment/hooks/usePaymentResult';

export default function PaymentFailureView() {
  const router = useRouter();
  const { payment, retrying, retryError, retryPayment } = usePaymentResult();

  return (
    <PaymentResultShell
      color="error"
      icon="ri-close-line"
      title="Pago no completado"
      description="Tu pago no pudo procesarse. Puedes intentar de nuevo o elegir otro medio de pago. Tu cita sigue reservada hasta que venza el plazo de pago."
      body={
        <>
          {payment?.failureReason && (
            <Alert severity="error" className="is-full">
              {payment.failureReason}
            </Alert>
          )}

          {retryError && (
            <Alert severity="warning" className="is-full">
              {retryError}
            </Alert>
          )}
        </>
      }
      actions={
        <>
          <Button
            variant="contained"
            onClick={retryPayment}
            disabled={retrying}
            startIcon={retrying ? <CircularProgress size={18} /> : <i className="ri-refresh-line" />}
          >
            {retrying ? 'Reintentando…' : 'Reintentar pago'}
          </Button>
          <Button variant="outlined" onClick={() => router.push('/patient/appointments')}>
            Mis citas
          </Button>
        </>
      }
    />
  );
}
