'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/views/booking/format';
import { PaymentDetails, PaymentResultShell } from '@/views/payment/components/PaymentResultShell';
import type { PaymentMethod } from '@/views/payment/types';
import { usePaymentResult } from '@/views/payment/hooks/usePaymentResult';

const REDIRECT_SECONDS = 5;

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  TRANSFER: 'Transferencia',
  INSURANCE: 'Seguro',
  OTHER: 'Otro',
};

export default function PaymentSuccessView() {
  const router = useRouter();
  const { payment, loading, error } = usePaymentResult();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/patient/appointments');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  return (
    <PaymentResultShell
      color="success"
      icon="ri-check-line"
      title="¡Pago confirmado!"
      description="Tu cita quedó confirmada. Te enviaremos un recordatorio antes de la consulta."
      body={
        <>
          {loading && <CircularProgress size={28} aria-label='Cargando el pago' />}

          {!loading && payment && (
            <PaymentDetails
              items={[
                { icon: 'ri-money-dollar-circle-line', label: 'Monto pagado', value: formatPrice(payment.amount, payment.currency) },
                { icon: 'ri-bank-card-line', label: 'Medio de pago', value: payment.paymentMethod ? PAYMENT_METHOD_LABELS[payment.paymentMethod] : '—' },
                ...(payment.gatewayId ? [{ icon: 'ri-hashtag', label: 'Operación', value: payment.gatewayId }] : []),
              ]}
            />
          )}

          {!loading && error && (
            <Typography variant='body2' color='text.secondary'>
              {error}
            </Typography>
          )}

          <div className='is-full'>
            <Typography variant='body2' color='text.secondary' className='mbe-1'>
              Te llevamos a tus citas en {countdown} s…
            </Typography>
            <LinearProgress
              variant='determinate'
              value={((REDIRECT_SECONDS - countdown) / REDIRECT_SECONDS) * 100}
              color='success'
              aria-label='Tiempo hasta ir a tus citas'
            />
          </div>
        </>
      }
      actions={
        <>
          <Button
            variant="contained"
            onClick={() => router.push('/patient/appointments')}
            startIcon={<i className="ri-calendar-line" />}
          >
            Ver mis citas
          </Button>
          <Button variant="outlined" onClick={() => router.push('/patient')}>
            Ir al inicio
          </Button>
        </>
      }
    />
  );
}
