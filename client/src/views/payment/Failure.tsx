'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { usePaymentResult } from '@/views/payment/hooks/usePaymentResult';

export default function PaymentFailureView() {
  const router = useRouter();
  const { payment, retrying, retryError, retryPayment } = usePaymentResult();

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
              bgcolor: 'error.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ri-close-line" style={{ fontSize: 36, color: '#fff' }} />
          </Box>

          <Typography variant="h5" fontWeight={700} textAlign="center">
            Pago no completado
          </Typography>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Tu pago no pudo procesarse. Puedes intentar de nuevo o elegir otro
            método de pago. Tu cita sigue reservada mientras no expire el plazo.
          </Typography>

          {payment?.failureReason && (
            <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>
              {payment.failureReason}
            </Alert>
          )}

          {retryError && (
            <Alert severity="warning" sx={{ width: '100%', borderRadius: 2 }}>
              {retryError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="error"
              onClick={retryPayment}
              disabled={retrying}
              startIcon={retrying ? <CircularProgress size={18} /> : <i className="ri-refresh-line" />}
            >
              {retrying ? 'Reintentando…' : 'Reintentar pago'}
            </Button>
            <Button variant="outlined" onClick={() => router.push('/patient/appointments')}>
              Mis citas
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
