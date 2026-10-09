import { formatDay, formatPrice } from '@/views/booking/format';
import type { Appointment } from '@/views/appointments/types';

export const appointmentDay = (a: Appointment) => a.schedule.scheduleDate.slice(0, 10);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Martes, 21 de octubre · 10:30 (hora de la sede)". */
export const whenLabel = (a: Appointment) => `${capitalize(formatDay(appointmentDay(a)))} · ${a.startTime} (hora de la sede)`;

/** "21/10/2026", para filas compactas y nombres accesibles. */
export const shortDay = (a: Appointment) =>
  new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${appointmentDay(a)}T12:00:00Z`),
  );

export const doctorName = (a: Appointment) => `${a.schedule.doctor.name} ${a.schedule.doctor.lastName}`;

export const priceLabel = (a: Appointment, amount: number | null = a.amount) =>
  amount !== null && a.clinic ? formatPrice(amount, a.clinic.currency) : '—';
