'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { PaymentResultShell } from '@/views/payment/components/PaymentResultShell';
import { usePaymentResult } from '@/views/payment/hooks/usePaymentResult';

const REDIRECT_SECONDS = 5;

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
      description="Tu cita ha sido confirmada exitosamente. Te enviaremos un recordatorio antes de la consulta."
      body={
        <>
          {loading && <CircularProgress size={28} sx={{ my: 1 }} />}

          {!loading && payment && (
            <Card variant="outlined" sx={{ width: '100%', borderRadius: 2, mt: 1 }}>
              <CardContent sx={{ py: 1.5 }}>
                <SummaryRow label="Monto pagado" value={`S/ ${payment.amount.toFixed(2)}`} valueWeight={600} />
                <Divider sx={{ my: 0.5 }} />
                <SummaryRow label="Método" value={payment.paymentMethod ?? '—'} valueWeight={500} />
                {payment.gatewayId && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <SummaryRow label="Operación" value={payment.gatewayId} mono />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {!loading && error && (
            <Typography variant="caption" color="warning.main" textAlign="center">
              {error}
            </Typography>
          )}

          <Box sx={{ width: '100%', mt: 1 }}>
            <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mb={0.5}>
              Redirigiendo a tus citas en {countdown}s…
            </Typography>
            <LinearProgress
              variant="determinate"
              value={((REDIRECT_SECONDS - countdown) / REDIRECT_SECONDS) * 100}
              color="success"
              sx={{ borderRadius: 1 }}
            />
          </Box>
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

function SummaryRow({
  label,
  value,
  valueWeight,
  mono,
}: {
  label: string;
  value: string;
  valueWeight?: number;
  mono?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant={mono ? 'caption' : 'body2'}
        fontWeight={valueWeight}
        fontFamily={mono ? 'monospace' : undefined}
      >
        {value}
      </Typography>
    </Box>
  );
}
