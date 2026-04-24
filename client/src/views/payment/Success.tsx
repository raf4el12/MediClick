'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { usePaymentResult } from '@/views/payment/hooks/usePaymentResult';

export default function PaymentSuccessView() {
  const router = useRouter();
  const { payment, loading, error } = usePaymentResult();

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
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ri-check-line" style={{ fontSize: 36, color: '#fff' }} />
          </Box>

          <Typography variant="h5" fontWeight={700} textAlign="center">
            ¡Pago confirmado!
          </Typography>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Tu cita ha sido confirmada exitosamente. Te enviaremos un recordatorio
            antes de la consulta.
          </Typography>

          {loading && <CircularProgress size={28} sx={{ my: 1 }} />}

          {!loading && payment && (
            <Card variant="outlined" sx={{ width: '100%', borderRadius: 2, mt: 1 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Monto pagado
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    S/ {payment.amount.toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Método
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {payment.paymentMethod ?? '—'}
                  </Typography>
                </Box>
                {payment.gatewayId && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Operación
                      </Typography>
                      <Typography variant="caption" fontFamily="monospace">
                        {payment.gatewayId}
                      </Typography>
                    </Box>
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

          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
