'use client';

import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { Appointment } from '@/views/appointments/types';
import { doctorName, priceLabel, whenLabel } from '../format';
import type { AppointmentAction } from '../functions/appointmentActions';
import { AppointmentActionButtons } from './AppointmentActionButtons';
import { AppointmentStatusChips } from './AppointmentStatusChips';

interface AppointmentDetailProps {
  appointment: Appointment | null;
  actions: AppointmentAction[];
  onClose: () => void;
  onRun: (action: AppointmentAction, appointment: Appointment) => void;
  paying: boolean;
}

/** Panel lateral con los datos, los montos y las acciones de una cita (decisión 6 de UI-10). */
export function AppointmentDetail({ appointment, actions, onClose, onRun, paying }: AppointmentDetailProps) {
  return (
    <Drawer
      anchor='right'
      open={!!appointment}
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-label': 'Detalle de la cita', className: 'is-[400px] max-is-full' } }}
    >
      {appointment && (
        <div className='flex flex-col gap-4 p-6'>
          <div className='flex items-start justify-between gap-2'>
            <AppointmentStatusChips appointment={appointment} />
            <IconButton aria-label='Cerrar detalle' onClick={onClose} size='small'>
              <i className='ri-close-line' />
            </IconButton>
          </div>
          <div>
            <Typography variant='h5' component='h2'>
              {appointment.schedule.specialty.name}
            </Typography>
            <Typography color='text.secondary'>{whenLabel(appointment)}</Typography>
          </div>
          <div>
            <Typography color='text.primary'>{doctorName(appointment)}</Typography>
            {appointment.clinic && (
              <Typography variant='body2' color='text.secondary'>
                {appointment.clinic.name}
                {appointment.clinic.address ? ` · ${appointment.clinic.address}` : ''}
              </Typography>
            )}
          </div>
          <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 m-0'>
            <Typography component='dt' color='text.secondary'>
              Total
            </Typography>
            <Typography component='dd' className='m-0'>
              {priceLabel(appointment)}
            </Typography>
            {appointment.cancellationFee !== null && (
              <>
                <Typography component='dt' color='text.secondary'>
                  Penalización
                </Typography>
                <Typography component='dd' className='m-0'>
                  {priceLabel(appointment, appointment.cancellationFee)}
                </Typography>
              </>
            )}
          </dl>
          {appointment.pendingUntil && appointment.paymentStatus === 'PENDING' && actions.includes('pay') && (
            <Alert severity='warning'>
              Paga antes de las{' '}
              {new Intl.DateTimeFormat('es', { timeStyle: 'short', timeZone: appointment.timezone }).format(new Date(appointment.pendingUntil))} para
              conservar el cupo.
            </Alert>
          )}
          {appointment.cancelReason && (
            <Typography variant='body2' color='text.secondary'>
              Motivo de la cancelación: {appointment.cancelReason}
            </Typography>
          )}
          {actions.length > 0 && (
            <>
              <Divider />
              <AppointmentActionButtons appointment={appointment} actions={actions} onRun={onRun} paying={paying} />
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}
