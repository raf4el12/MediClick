'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { Appointment } from '@/views/appointments/types';
import type { AppointmentAction } from '../functions/appointmentActions';

export const ACTION_LABEL: Record<AppointmentAction, string> = {
  pay: 'Pagar',
  checkInQr: 'Código de llegada',
  reschedule: 'Reagendar',
  cancel: 'Cancelar',
  review: 'Dejar reseña',
  prescription: 'Ver receta',
  receipt: 'Comprobante',
};

export const ACTION_ICON: Record<AppointmentAction, string> = {
  pay: 'ri-bank-card-line',
  checkInQr: 'ri-qr-code-line',
  reschedule: 'ri-calendar-schedule-line',
  cancel: 'ri-close-circle-line',
  review: 'ri-star-line',
  prescription: 'ri-file-list-3-line',
  receipt: 'ri-file-text-line',
};

/** Receta y comprobante son páginas imprimibles (UI-12); el resto abre un diálogo o paga. */
export const actionHref = (action: AppointmentAction, a: Appointment) =>
  action === 'prescription' ? `/patient/appointments/${a.id}/receta` : action === 'receipt' ? `/patient/appointments/${a.id}/comprobante` : null;

interface AppointmentActionButtonsProps {
  appointment: Appointment;
  actions: AppointmentAction[];
  onRun: (action: AppointmentAction, appointment: Appointment) => void;
  paying?: boolean;
}

/** Acciones de la cita; la primera se destaca. */
export function AppointmentActionButtons({ appointment, actions, onRun, paying }: AppointmentActionButtonsProps) {
  return (
    <div className='flex flex-wrap gap-2'>
      {actions.map((action, i) => {
        const href = actionHref(action, appointment);
        const common = {
          size: 'small' as const,
          variant: i === 0 ? ('contained' as const) : ('outlined' as const),
          startIcon:
            action === 'pay' && paying ? <CircularProgress size={16} color='inherit' aria-label='Abriendo el pago' /> : <i className={ACTION_ICON[action]} />,
        };
        return href ? (
          <Button key={action} {...common} component={Link} href={href}>
            {ACTION_LABEL[action]}
          </Button>
        ) : (
          <Button key={action} {...common} disabled={action === 'pay' && paying} onClick={() => onRun(action, appointment)}>
            {ACTION_LABEL[action]}
          </Button>
        );
      })}
    </div>
  );
}
