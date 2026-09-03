'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { appointmentsService } from '@/services/appointments.service';

interface DecodedPayload {
  appointmentId?: number;
  action?: 'CONFIRM' | 'CANCEL';
  expiresAt?: number;
}

function decodeReminderToken(token: string): DecodedPayload | null {
  try {
    const parts = token.split('.');
    if (!parts[0]) return null;
    const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as DecodedPayload;
  } catch {
    return null;
  }
}

function ReminderRespondContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const payload = useMemo(() => {
    if (!token) return null;
    return decodeReminderToken(token);
  }, [token]);

  const handleAction = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await appointmentsService.respondToReminder(token);
      setResult({
        success: true,
        message: res.message,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Ocurrió un error al procesar tu solicitud.';
      setResult({
        success: false,
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token || !payload || !payload.action) {
    return (
      <Card sx={{ maxWidth: 480, mx: 'auto', mt: 8, p: 3, textAlign: 'center' }}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            El enlace de recordatorio no es válido o ha expirado.
          </Alert>
          <Button variant="outlined" onClick={() => router.push('/')}>
            Ir al inicio
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isConfirm = payload.action === 'CONFIRM';

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
      <Card sx={{ maxWidth: 480, width: '100%', p: 2, borderRadius: 2, boxShadow: 3 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          {result ? (
            <>
              <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 3 }}>
                {result.message}
              </Alert>
              <Button
                variant="contained"
                onClick={() => router.push('/patient/appointments')}
                fullWidth
              >
                Ver mis citas
              </Button>
            </>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
                  {isConfirm
                    ? 'Confirmar asistencia a tu cita'
                    : 'Cancelar tu cita médica'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isConfirm
                    ? 'Por favor confirma que asistirás a tu consulta médica programada.'
                    : 'Si cancelas tu cita, el cupo será liberado inmediatamente para otro paciente.'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  variant="contained"
                  color={isConfirm ? 'primary' : 'error'}
                  size="large"
                  disabled={loading}
                  onClick={handleAction}
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : undefined
                  }
                  fullWidth
                >
                  {loading
                    ? 'Procesando...'
                    : isConfirm
                      ? 'Sí, confirmar asistencia'
                      : 'Sí, cancelar mi cita'}
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={loading}
                  onClick={() => router.push('/')}
                  fullWidth
                >
                  Volver al inicio
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default function ReminderRespondPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <ReminderRespondContent />
    </Suspense>
  );
}
