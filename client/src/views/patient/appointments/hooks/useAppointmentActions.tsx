'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsService } from '@/services/payments.service';
import { reviewsService } from '@/services/reviews.service';
import { extractApiError } from '@/utils/extractApiError';
import { notify } from '@/utils/notify';
import { ReviewDialog } from '@/views/reviews/components/ReviewDialog';
import type { Appointment } from '@/views/appointments/types';
import { CancelAppointmentDialog } from '../components/CancelAppointmentDialog';
import { CheckInQrDialog } from '../components/CheckInQrDialog';
import { RescheduleAppointmentDialog } from '../components/RescheduleAppointmentDialog';
import { doctorName } from '../format';
import type { AppointmentAction } from '../functions/appointmentActions';

type DialogAction = 'cancel' | 'reschedule' | 'checkInQr' | 'review';

/**
 * Ejecuta las acciones del paciente sobre una cita: pagar y los diálogos de
 * cancelar, reagendar, código de llegada y reseña. Lo comparten Inicio y Mis citas.
 */
export function useAppointmentActions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<{ action: DialogAction; appointment: Appointment } | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  const reviews = useQuery({ queryKey: ['patient', 'reviews'], queryFn: () => reviewsService.getMine(), staleTime: 60 * 1000 });
  const reviewedIds = new Set((reviews.data ?? []).map((r) => r.appointmentId));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
    void queryClient.invalidateQueries({ queryKey: ['patient', 'summary'] });
  };
  const close = () => setOpen(null);

  const pay = async (a: Appointment) => {
    setPayingId(a.id);
    try {
      const preference = await paymentsService.createPreference(a.id);
      window.location.assign(preference.initPoint);
    } catch (err) {
      const { message } = extractApiError(err, 'No pudimos abrir el pago');
      // Decisión 10 de UI-10: con una transacción pendiente no se reintenta hasta que vence el plazo.
      if (message.includes('pendiente')) {
        const until = a.pendingUntil
          ? ` Si cerraste Mercado Pago, podrás intentarlo de nuevo después de las ${new Intl.DateTimeFormat('es', { timeStyle: 'short', timeZone: a.timezone }).format(new Date(a.pendingUntil))}.`
          : '';
        notify(`Tu pago está en proceso.${until}`, 'warning');
      } else {
        notify(message, 'error');
      }
      setPayingId(null);
    }
  };

  const run = (action: AppointmentAction, appointment: Appointment) => {
    if (action === 'pay') void pay(appointment);
    else if (action === 'cancel' || action === 'reschedule' || action === 'checkInQr' || action === 'review') setOpen({ action, appointment });
  };

  const dialogs = (
    <>
      {open?.action === 'cancel' && (
        <CancelAppointmentDialog
          appointment={open.appointment}
          onClose={close}
          onCancelled={() => {
            close();
            notify('Cita cancelada', 'success');
            refresh();
          }}
        />
      )}
      {open?.action === 'reschedule' && (
        <RescheduleAppointmentDialog
          appointment={open.appointment}
          onClose={close}
          onRescheduled={() => {
            close();
            notify('Cita reagendada', 'success');
            refresh();
          }}
        />
      )}
      {open?.action === 'checkInQr' && <CheckInQrDialog appointment={open.appointment} onClose={close} />}
      <ReviewDialog
        open={open?.action === 'review'}
        onClose={close}
        appointmentId={open?.appointment.id ?? 0}
        doctorName={open ? doctorName(open.appointment) : ''}
        onSubmitted={() => {
          close();
          notify('Gracias por tu reseña', 'success');
          void queryClient.invalidateQueries({ queryKey: ['patient', 'reviews'] });
        }}
      />
    </>
  );

  return { run, dialogs, reviewedIds, payingId };
}
