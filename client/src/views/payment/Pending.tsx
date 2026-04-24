'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { usePaymentResult } from '@/views/payment/hooks/usePaymentResult';

export default function PaymentPendingView() {
  const router = useRouter();
  const { payment, loading, refetch } = usePaymentResult({
    pollIntervalMs: 5000,
  });

  // Si durante el poll el estado pasa a PAID/FAILED, redirigir a la página correspondiente.
  useEffect(() => {
    if (!payment) return;
    if (payment.status === 'PAID') {
      router.replace(
        `/payment/success?external_reference=${payment.appointmentId}${payment.gatewayId ? `&payment_id=${payment.gatewayId}` : ''}`,
      );
    } else if (payment.status === 'FAILED') {
      router.replace(
        `/payment/failure?external_reference=${payment.appointmentId}${payment.gatewayId ? `&payment_id=${payment.gatewayId}` : ''}`,
      );
    }
  }, [payment, router]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%', borderRadius: 3, p: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'warning.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ri-time-line" style={{ fontSize: 36, color: '#fff' }} />
          </Box>

          <Typography variant="h5" fontWeight={700} textAlign="center">
            Procesando pago…
          </Typography>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Mercado Pago está validando tu pago. Esta página se actualiza
            automáticamente; puedes cerrarla y te notificaremos cuando se
            confirme.
          </Typography>

          <CircularProgress size={28} sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
