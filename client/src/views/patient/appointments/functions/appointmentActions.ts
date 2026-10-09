import { localToInstant } from '@/utils/timezone';
import { AppointmentStatus, type Appointment } from '@/views/appointments/types';

export type AppointmentAction = 'pay' | 'checkInQr' | 'reschedule' | 'cancel' | 'review' | 'prescription' | 'receipt';

// Estados de pago con al menos una transacción aprobada (el comprobante las lista).
const HAS_APPROVED_PAYMENT = new Set(['PAID', 'PARTIAL', 'REFUNDED']);

/** Instante real de inicio: día de agenda y hora en la zona de la sede de la cita. */
export const appointmentStart = (a: Appointment) => localToInstant(a.schedule.scheduleDate.slice(0, 10), a.startTime, a.timezone);

/**
 * Acciones que el paciente puede tomar sobre una cita. Reflejan las reglas del
 * servidor para no ofrecer lo que este rechazaría (UI-11, matriz de acciones).
 */
export function appointmentActions(a: Appointment, { now, reviewed }: { now: Date; reviewed: boolean }): AppointmentAction[] {
  const future = appointmentStart(a) > now;
  const receipt: AppointmentAction[] = HAS_APPROVED_PAYMENT.has(a.paymentStatus) ? ['receipt'] : [];
  const change: AppointmentAction[] = future ? ['reschedule', 'cancel'] : [];

  switch (a.status) {
    case AppointmentStatus.PENDING: {
      // Mercado Pago solo acepta el pago mientras dura el plazo.
      const canPay = a.paymentStatus === 'PENDING' && !!a.pendingUntil && new Date(a.pendingUntil) > now;
      return [...(canPay ? (['pay'] as const) : []), ...change];
    }
    case AppointmentStatus.CONFIRMED:
      return [
        ...(a.paymentStatus === 'PARTIAL' ? (['pay'] as const) : []),
        ...(a.paymentStatus === 'PAID' && future ? (['checkInQr'] as const) : []),
        ...change,
        ...receipt,
      ];
    case AppointmentStatus.COMPLETED:
      return [...(reviewed ? [] : (['review'] as const)), ...(a.hasPrescription ? (['prescription'] as const) : []), ...receipt];
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
      return receipt;
    default:
      return [];
  }
}
