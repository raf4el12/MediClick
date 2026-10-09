'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import BlankLayout from '@/@layouts/BlankLayout';
import AuthLayout from '@/views/auth/AuthLayout';
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
      <AuthLayout illustration="verify-email" title="Enlace no válido">
        <Alert severity="error">El enlace de recordatorio no es válido o ha expirado.</Alert>
        <Button component={Link} href="/" variant="outlined" fullWidth>
          Ir al inicio
        </Button>
      </AuthLayout>
    );
  }

  const isConfirm = payload.action === 'CONFIRM';

  return (
    <AuthLayout
      illustration="verify-email"
      title={isConfirm ? 'Confirmar asistencia a tu cita' : 'Cancelar tu cita médica'}
      subtitle={
        result
          ? undefined
          : isConfirm
            ? 'Por favor confirma que asistirás a tu consulta médica programada.'
            : 'Si cancelas tu cita, el cupo será liberado inmediatamente para otro paciente.'
      }
    >
      {result ? (
        <>
          <Alert severity={result.success ? 'success' : 'error'}>{result.message}</Alert>
          <Button component={Link} href="/patient/appointments" variant="contained" fullWidth>
            Ver mis citas
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <Button
            variant="contained"
            color={isConfirm ? 'primary' : 'error'}
            disabled={loading}
            onClick={handleAction}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
            fullWidth
          >
            {loading ? 'Procesando...' : isConfirm ? 'Sí, confirmar asistencia' : 'Sí, cancelar mi cita'}
          </Button>
          <Button component={Link} href="/" variant="outlined" disabled={loading} fullWidth>
            Volver al inicio
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

export default function ReminderRespondPage() {
  return (
    <BlankLayout>
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress aria-label="Cargando" />
          </Box>
        }
      >
        <ReminderRespondContent />
      </Suspense>
    </BlankLayout>
  );
}
