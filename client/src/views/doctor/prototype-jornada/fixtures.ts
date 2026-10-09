// PROTOTIPO UI-14 — Tres variantes de la jornada del médico, conmutables con `?variant=`,
// sobre `/doctor`. PROTOTIPO — se descarta. Datos falsos con la forma de `AgendaResponseDto`
// (UI-13): un médico, dos especialidades, 3 días, citas en todos los estados, un bloqueo de
// agenda por horas, un feriado de la sede, una cita en riesgo y una con pago pendiente.

export type AgendaStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type AgendaAppointment = {
  id: number;
  scheduleId: number;
  specialtyId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AgendaStatus;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  isOverbook: boolean;
  isAtRisk: boolean;
  patient: { id: number; fullName: string; age: number; document: string; allergies: string | null; lastVisit: string | null };
  reason: string | null;
};

export type AgendaCupo = { scheduleId: number; specialtyId: number; date: string; startTime: string; endTime: string; available: boolean };
export type AgendaBlock = { id: number; type: 'FULL_DAY' | 'TIME_RANGE'; startDate: string; endDate: string; timeFrom: string | null; timeTo: string | null; reason: string };
export type AgendaHoliday = { id: number; date: string; name: string; scope: 'GLOBAL' | 'CLINIC' };

const pad = (n: number) => String(n).padStart(2, '0');
export const dayOffset = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const TODAY = dayOffset(0);
export const DAYS = [dayOffset(0), dayOffset(1), dayOffset(2)];

export const timezone = 'America/Lima';
export const doctor = {
  id: 1,
  fullName: 'Lucía Paredes',
  specialties: [
    { id: 1, name: 'Medicina General' },
    { id: 2, name: 'Cardiología' },
  ],
};

const patient = (id: number, fullName: string, age: number, allergies: string | null = null, lastVisit: string | null = null) => ({
  id,
  fullName,
  age,
  document: `DNI ${40000000 + id * 1371}`,
  allergies,
  lastVisit,
});

export const appointments: AgendaAppointment[] = [
  { id: 1, scheduleId: 10, specialtyId: 1, date: TODAY, startTime: '08:00', endTime: '08:20', status: 'COMPLETED', paymentStatus: 'PAID', isOverbook: false, isAtRisk: false, patient: patient(1, 'Ana Torres', 34, null, dayOffset(-60)), reason: 'Control anual' },
  { id: 2, scheduleId: 10, specialtyId: 1, date: TODAY, startTime: '08:20', endTime: '08:40', status: 'NO_SHOW', paymentStatus: 'PAID', isOverbook: false, isAtRisk: false, patient: patient(2, 'Bruno Salazar', 51), reason: 'Dolor lumbar' },
  { id: 3, scheduleId: 10, specialtyId: 1, date: TODAY, startTime: '09:00', endTime: '09:20', status: 'IN_PROGRESS', paymentStatus: 'PAID', isOverbook: false, isAtRisk: false, patient: patient(3, 'Carla Gómez', 28, 'Penicilina', dayOffset(-120)), reason: 'Fiebre y tos hace 3 días' },
  { id: 4, scheduleId: 10, specialtyId: 1, date: TODAY, startTime: '09:20', endTime: '09:40', status: 'CONFIRMED', paymentStatus: 'PAID', isOverbook: false, isAtRisk: false, patient: patient(4, 'Diego Herrera', 45), reason: 'Revisión de análisis' },
  { id: 5, scheduleId: 10, specialtyId: 1, date: TODAY, startTime: '09:40', endTime: '10:00', status: 'CONFIRMED', paymentStatus: 'PAID', isOverbook: false, isAtRisk: true, patient: patient(5, 'Elena Vargas', 67, 'AINEs', dayOffset(-15)), reason: 'Presión alta' },
  { id: 6, scheduleId: 11, specialtyId: 2, date: TODAY, startTime: '11:00', endTime: '11:30', status: 'PENDING', paymentStatus: 'PENDING', isOverbook: false, isAtRisk: false, patient: patient(6, 'Fernando Ríos', 59), reason: 'Palpitaciones' },
  { id: 7, scheduleId: 11, specialtyId: 2, date: TODAY, startTime: '11:30', endTime: '12:00', status: 'CONFIRMED', paymentStatus: 'PARTIAL', isOverbook: false, isAtRisk: false, patient: patient(7, 'Gabriela Castro', 72, null, dayOffset(-30)), reason: 'Control post infarto' },
  { id: 8, scheduleId: 11, specialtyId: 2, date: TODAY, startTime: '12:00', endTime: '12:30', status: 'CANCELLED', paymentStatus: 'PAID', isOverbook: false, isAtRisk: false, patient: patient(8, 'Hugo Medina', 40), reason: null },
  { id: 9, scheduleId: 11, specialtyId: 2, date: TODAY, startTime: '12:00', endTime: '12:30', status: 'CONFIRMED', paymentStatus: 'PAID', isOverbook: true, isAtRisk: false, patient: patient(9, 'Isabel Núñez', 63), reason: 'Sobrecupo por urgencia' },
  { id: 10, scheduleId: 12, specialtyId: 1, date: DAYS[1]!, startTime: '08:00', endTime: '08:20', status: 'CONFIRMED', paymentStatus: 'PAID', isOverbook: false, isAtRisk: false, patient: patient(10, 'Javier Ortiz', 38), reason: 'Chequeo' },
  { id: 11, scheduleId: 12, specialtyId: 1, date: DAYS[1]!, startTime: '08:40', endTime: '09:00', status: 'PENDING', paymentStatus: 'PENDING', isOverbook: false, isAtRisk: false, patient: patient(11, 'Karen León', 25), reason: 'Alergia estacional' },
  { id: 12, scheduleId: 13, specialtyId: 2, date: DAYS[1]!, startTime: '11:30', endTime: '12:00', status: 'CONFIRMED', paymentStatus: 'PAID', isOverbook: false, isAtRisk: true, patient: patient(12, 'Luis Pérez', 70), reason: 'Arritmia' },
];

/** Cupos de 08:00 a 10:00 (Medicina General, 20 min) y de 11:00 a 13:00 (Cardiología, 30 min). */
function cuposFor(date: string): AgendaCupo[] {
  const out: AgendaCupo[] = [];
  const add = (specialtyId: number, scheduleId: number, from: number, to: number, step: number) => {
    for (let m = from; m + step <= to; m += step) {
      const start = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      const end = `${pad(Math.floor((m + step) / 60))}:${pad((m + step) % 60)}`;
      const taken = appointments.some(
        (a) => a.date === date && a.startTime === start && a.status !== 'CANCELLED' && !a.isOverbook,
      );
      // Bloqueo de agenda de 10:00 a 11:00 el primer día; feriado de sede el tercero.
      out.push({ scheduleId, specialtyId, date, startTime: start, endTime: end, available: !taken && date !== DAYS[2] });
    }
  };
  add(1, 10, 8 * 60, 10 * 60, 20);
  add(2, 11, 11 * 60, 13 * 60, 30);
  return out;
}

export const cupos: AgendaCupo[] = DAYS.flatMap(cuposFor);

export const blocks: AgendaBlock[] = [
  { id: 1, type: 'TIME_RANGE', startDate: TODAY, endDate: TODAY, timeFrom: '10:00', timeTo: '11:00', reason: 'Reunión de servicio' },
];

export const holidays: AgendaHoliday[] = [{ id: 1, date: DAYS[2]!, name: 'Aniversario de la sede', scope: 'CLINIC' }];

const active = (a: AgendaAppointment) => !['CANCELLED', 'NO_SHOW'].includes(a.status);

export function indicatorsFor(date: string) {
  const dayCupos = cupos.filter((c) => c.date === date);
  const dayAppointments = appointments.filter((a) => a.date === date);
  const booked = dayCupos.filter((c) => !c.available).length;
  const byStatus = dayAppointments.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {});
  return {
    totalCupos: dayCupos.length,
    bookedCupos: booked,
    occupancyRate: dayCupos.length ? booked / dayCupos.length : 0,
    byStatus,
    atRisk: dayAppointments.filter((a) => a.isAtRisk && active(a)).length,
    pendingPayment: dayAppointments.filter((a) => a.paymentStatus !== 'PAID' && active(a)).length,
  };
}

export const specialtyName = (id: number) => doctor.specialties.find((s) => s.id === id)?.name ?? '';

export const STATUS_LABEL: Record<AgendaStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En atención',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'Inasistencia',
};

export const STATUS_COLOR: Record<AgendaStatus, 'warning' | 'success' | 'info' | 'primary' | 'secondary' | 'error'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'primary',
  CANCELLED: 'secondary',
  NO_SHOW: 'error',
};

export const dayTitle = (iso: string) => {
  const s = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
