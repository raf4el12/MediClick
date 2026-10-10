'use client';

import Chip from '@mui/material/Chip';
import { AppointmentStatus } from '@/views/appointments/types';
import { STATUS_META } from '../status';
import type { AgendaAppointment } from '../types';

const OPEN: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
const CLOSED: AppointmentStatus[] = [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW];

/** Estado de la cita y sus marcas: en riesgo, pago y sobrecupo. */
export default function AgendaStatusChips({ appointment, status = appointment.status }: { appointment: AgendaAppointment; status?: AppointmentStatus }) {
  const { label, color } = STATUS_META[status];
  const payment = CLOSED.includes(status) ? null : appointment.paymentStatus === 'PENDING' ? 'Pago pendiente' : appointment.paymentStatus === 'PARTIAL' ? 'Seña pagada' : null;

  return (
    <span className='flex flex-wrap gap-1'>
      <Chip size='small' variant='tonal' color={color} label={label} />
      {appointment.isAtRisk && OPEN.includes(status) && <Chip size='small' variant='tonal' color='error' label='En riesgo' />}
      {payment && <Chip size='small' variant='outlined' label={payment} />}
      {appointment.isOverbook && <Chip size='small' variant='outlined' label='Sobrecupo' />}
    </span>
  );
}
