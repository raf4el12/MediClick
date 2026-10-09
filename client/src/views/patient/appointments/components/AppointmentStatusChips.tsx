'use client';

import Chip from '@mui/material/Chip';
import { AppointmentStatus, type Appointment } from '@/views/appointments/types';

const STATUS: Record<AppointmentStatus, { label: string; color: 'warning' | 'success' | 'info' | 'primary' | 'secondary' | 'error' }> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: 'warning' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: 'success' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En curso', color: 'info' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: 'primary' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: 'secondary' },
  [AppointmentStatus.NO_SHOW]: { label: 'Inasistencia', color: 'error' },
};

const PAYMENT: Record<string, string> = {
  PENDING: 'Pago pendiente',
  PARTIAL: 'Seña pagada',
  PAID: 'Pagada',
  REFUNDED: 'Reembolsada',
  FAILED: 'Pago rechazado',
  CANCELLED: 'Pago anulado',
};

/** Estado asistencial y estado de pago, por separado. */
export function AppointmentStatusChips({ appointment }: { appointment: Appointment }) {
  const status = STATUS[appointment.status];
  const closed = appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.NO_SHOW;
  return (
    <span className='flex flex-wrap gap-1'>
      <Chip size='small' variant='tonal' color={status.color} label={status.label} />
      {!closed && <Chip size='small' variant='outlined' label={PAYMENT[appointment.paymentStatus] ?? appointment.paymentStatus} />}
    </span>
  );
}
