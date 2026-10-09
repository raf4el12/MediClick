// PROTOTIPO UI-10 — Tres variantes de Inicio y de Mis citas, conmutables con `?variant=`,
// sobre `/patient` y `/patient/appointments`. Datos falsos en memoria: nada llama a la API
// ni se mergea. Un paciente con citas en dos sedes de zona distinta y en todos los estados.

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'FAILED';

export type ProtoClinic = { name: string; city: string; timezone: string; currency: string; address: string };

export type ProtoAppointment = {
  id: number;
  date: string; // día local de la sede
  start: string;
  end: string;
  clinic: ProtoClinic;
  doctor: string;
  specialty: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  paidAmount: number;
  /** Plazo de pago (instante) de una reserva en línea pendiente. */
  pendingUntil?: string;
  reviewed?: boolean;
  hasPrescription?: boolean;
  cancellationFee?: number;
  history: { at: string; label: string }[];
};

export type ProtoWaitlistEntry = { id: number; specialty: string; doctor?: string; clinic: ProtoClinic; from: string; to: string; preference: string };
export type ProtoOffer = { id: number; doctor: string; specialty: string; clinic: ProtoClinic; date: string; start: string; expiresAt: string };

export const lima: ProtoClinic = {
  name: 'Sede Miraflores',
  city: 'Lima',
  timezone: 'America/Lima',
  currency: 'PEN',
  address: 'Av. Larco 1150, Miraflores',
};
export const palermo: ProtoClinic = {
  name: 'Sede Palermo',
  city: 'Buenos Aires',
  timezone: 'America/Argentina/Buenos_Aires',
  currency: 'ARS',
  address: 'Av. Santa Fe 3250, Palermo',
};

const pad = (n: number) => String(n).padStart(2, '0');
export const dayOffset = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

export const patientName = 'Ana';

export const appointments: ProtoAppointment[] = [
  {
    id: 101,
    date: dayOffset(1),
    start: '10:30',
    end: '11:10',
    clinic: palermo,
    doctor: 'Martín Fernández',
    specialty: 'Traumatología',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    amount: 65000,
    paidAmount: 65000,
    history: [
      { at: dayOffset(-3), label: 'Reservada en línea' },
      { at: dayOffset(-3), label: 'Pago aprobado' },
    ],
  },
  {
    id: 102,
    date: dayOffset(3),
    start: '09:00',
    end: '09:30',
    clinic: lima,
    doctor: 'Lucía Paredes',
    specialty: 'Cardiología',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    amount: 150,
    paidAmount: 0,
    pendingUntil: minutesFromNow(12),
    history: [{ at: dayOffset(0), label: 'Reservada en línea; esperando el pago' }],
  },
  {
    id: 103,
    date: dayOffset(5),
    start: '16:00',
    end: '16:30',
    clinic: palermo,
    doctor: 'Martín Fernández',
    specialty: 'Cardiología',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    amount: 60000,
    paidAmount: 0,
    pendingUntil: minutesFromNow(-40),
    history: [
      { at: dayOffset(0), label: 'Reservada en línea' },
      { at: dayOffset(0), label: 'Plazo de pago vencido; se liberará el cupo' },
    ],
  },
  {
    id: 104,
    date: dayOffset(10),
    start: '11:00',
    end: '11:30',
    clinic: lima,
    doctor: 'Sofía Méndez',
    specialty: 'Ginecología',
    status: 'CONFIRMED',
    paymentStatus: 'PARTIAL',
    amount: 140,
    paidAmount: 50,
    history: [
      { at: dayOffset(-1), label: 'Reservada en línea' },
      { at: dayOffset(-1), label: 'Seña aprobada (S/ 50.00)' },
    ],
  },
  {
    id: 105,
    date: dayOffset(0),
    start: '08:40',
    end: '09:00',
    clinic: lima,
    doctor: 'Lucía Paredes',
    specialty: 'Medicina General',
    status: 'IN_PROGRESS',
    paymentStatus: 'PAID',
    amount: 80,
    paidAmount: 80,
    history: [
      { at: dayOffset(-2), label: 'Reservada en línea' },
      { at: dayOffset(0), label: 'Llegaste a la sede' },
    ],
  },
  {
    id: 106,
    date: dayOffset(-7),
    start: '15:20',
    end: '15:40',
    clinic: lima,
    doctor: 'Lucía Paredes',
    specialty: 'Medicina General',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    amount: 80,
    paidAmount: 80,
    reviewed: false,
    hasPrescription: true,
    history: [
      { at: dayOffset(-9), label: 'Reservada en línea' },
      { at: dayOffset(-7), label: 'Atención completada' },
      { at: dayOffset(-7), label: 'Receta emitida' },
    ],
  },
  {
    id: 107,
    date: dayOffset(-20),
    start: '12:00',
    end: '12:40',
    clinic: palermo,
    doctor: 'Martín Fernández',
    specialty: 'Traumatología',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    amount: 65000,
    paidAmount: 65000,
    reviewed: true,
    hasPrescription: false,
    history: [
      { at: dayOffset(-25), label: 'Reservada en línea' },
      { at: dayOffset(-20), label: 'Atención completada' },
      { at: dayOffset(-19), label: 'Dejaste una reseña' },
    ],
  },
  {
    id: 108,
    date: dayOffset(-12),
    start: '10:00',
    end: '10:30',
    clinic: lima,
    doctor: 'Lucía Paredes',
    specialty: 'Cardiología',
    status: 'CANCELLED',
    paymentStatus: 'REFUNDED',
    amount: 150,
    paidAmount: 150,
    cancellationFee: 40,
    history: [
      { at: dayOffset(-15), label: 'Reservada en línea' },
      { at: dayOffset(-12), label: 'Cancelada 3 h antes: penalización de S/ 40.00' },
    ],
  },
  {
    id: 109,
    date: dayOffset(-30),
    start: '17:00',
    end: '17:30',
    clinic: palermo,
    doctor: 'Martín Fernández',
    specialty: 'Cardiología',
    status: 'NO_SHOW',
    paymentStatus: 'PAID',
    amount: 60000,
    paidAmount: 60000,
    history: [
      { at: dayOffset(-33), label: 'Reservada en línea' },
      { at: dayOffset(-30), label: 'Inasistencia registrada' },
    ],
  },
];

export const waitlist: ProtoWaitlistEntry[] = [
  { id: 1, specialty: 'Dermatología', clinic: lima, from: dayOffset(0), to: dayOffset(14), preference: 'Por la mañana' },
  { id: 2, specialty: 'Cardiología', doctor: 'Lucía Paredes', clinic: lima, from: dayOffset(2), to: dayOffset(20), preference: 'Cualquier hora' },
];

export const offers: ProtoOffer[] = [
  { id: 1, doctor: 'Lucía Paredes', specialty: 'Cardiología', clinic: lima, date: dayOffset(2), start: '08:00', expiresAt: minutesFromNow(25) },
];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'Inasistencia',
};

export const STATUS_COLOR: Record<AppointmentStatus, 'warning' | 'success' | 'info' | 'primary' | 'secondary' | 'error'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'primary',
  CANCELLED: 'secondary',
  NO_SHOW: 'error',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pago pendiente',
  PARTIAL: 'Seña pagada',
  PAID: 'Pagada',
  REFUNDED: 'Reembolsada',
  FAILED: 'Pago rechazado',
};

/** Instante de inicio en la zona de la sede (aproximado para el prototipo). */
export const startsAt = (a: ProtoAppointment) => new Date(`${a.date}T${a.start}:00`);

export type ProtoAction = 'pay' | 'reschedule' | 'cancel' | 'review' | 'prescription' | 'receipt' | 'checkInQr' | 'directions';

/** Aproximación de la matriz de UI-11 (Task 1) para el prototipo. */
export function actionsFor(a: ProtoAppointment, now = new Date()): ProtoAction[] {
  const future = startsAt(a) > now;
  const deadlineOk = a.pendingUntil ? new Date(a.pendingUntil) > now : false;
  switch (a.status) {
    case 'PENDING':
      return [...(deadlineOk ? (['pay'] as const) : []), ...(future ? (['reschedule', 'cancel'] as const) : []), 'directions'];
    case 'CONFIRMED':
      return [
        ...(a.paymentStatus === 'PARTIAL' ? (['pay'] as const) : []),
        ...(future ? (['checkInQr', 'reschedule', 'cancel'] as const) : []),
        ...(a.paymentStatus === 'PAID' ? (['receipt'] as const) : []),
        'directions',
      ];
    case 'COMPLETED':
      return [...(a.reviewed ? [] : (['review'] as const)), ...(a.hasPrescription ? (['prescription'] as const) : []), 'receipt'];
    case 'CANCELLED':
    case 'NO_SHOW':
      return a.paidAmount > 0 ? ['receipt'] : [];
    default:
      return [];
  }
}

export const ACTION_LABEL: Record<ProtoAction, string> = {
  pay: 'Pagar',
  reschedule: 'Reagendar',
  cancel: 'Cancelar',
  review: 'Dejar reseña',
  prescription: 'Ver receta',
  receipt: 'Comprobante',
  checkInQr: 'Código de llegada',
  directions: 'Cómo llegar',
};

export const ACTION_ICON: Record<ProtoAction, string> = {
  pay: 'ri-bank-card-line',
  reschedule: 'ri-calendar-schedule-line',
  cancel: 'ri-close-circle-line',
  review: 'ri-star-line',
  prescription: 'ri-medicine-bottle-line',
  receipt: 'ri-file-text-line',
  checkInQr: 'ri-qr-code-line',
  directions: 'ri-map-pin-line',
};

export const nextAppointment = () =>
  appointments
    .filter((a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && startsAt(a) > new Date())
    .sort((a, b) => startsAt(a).getTime() - startsAt(b).getTime())[0];

export const awaitingPayment = () =>
  appointments.filter(
    (a) =>
      (a.status === 'PENDING' && a.paymentStatus === 'PENDING' && a.pendingUntil && new Date(a.pendingUntil) > new Date()) ||
      (a.status === 'CONFIRMED' && a.paymentStatus === 'PARTIAL'),
  );

export const pendingReviews = () => appointments.filter((a) => a.status === 'COMPLETED' && !a.reviewed);

export const minutesLeft = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
