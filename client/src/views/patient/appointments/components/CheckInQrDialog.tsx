'use client';

import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { appointmentsService } from '@/services/appointments.service';
import type { Appointment } from '@/views/appointments/types';

/** Código QR de llegada (`GET /appointments/:id/check-in-qr`), decisión 3 de UI-10. */
export function CheckInQrDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const qr = useQuery({
    queryKey: ['patient', 'check-in-qr', appointment.id],
    queryFn: () => appointmentsService.getCheckInQr(appointment.id),
    staleTime: 60 * 1000,
  });
  const time = (iso: string) =>
    new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short', timeZone: appointment.timezone }).format(new Date(iso));

  return (
    <Dialog open onClose={onClose} maxWidth='xs' fullWidth aria-labelledby='check-in-qr-title'>
      <DialogTitle id='check-in-qr-title'>Código de llegada</DialogTitle>
      <DialogContent className='flex flex-col items-center gap-4 text-center'>
        {qr.isLoading && <CircularProgress aria-label='Generando el código' />}
        {qr.isError && <Alert severity='error'>No pudimos generar el código. Intenta de nuevo.</Alert>}
        {qr.data && (
          <>
            <div className='p-3 rounded bg-white'>
              <QRCodeSVG value={qr.data.qrToken} size={220} role='img' aria-label='Código QR de llegada' />
            </div>
            <Typography variant='body2' color='text.secondary'>
              Muéstralo en recepción de {appointment.clinic?.name ?? 'la sede'}. Sirve desde el {time(qr.data.opensAt)} hasta el{' '}
              {time(qr.data.expiresAt)} (hora de la sede).
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
