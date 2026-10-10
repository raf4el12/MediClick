// PROTOTIPO UI-17 — datos falsos con la forma de `AgendaSnapshot` (UI-13) y de las reglas de
// disponibilidad. Ninguna variante llama a la API.

import { AppointmentStatus } from '@/views/appointments/types';
import type { AgendaAppointment, AgendaBlock, AgendaCupo, AgendaHoliday, AgendaSnapshot } from '@/views/agenda/types';
import { getTodayInTimezone } from '@/utils/timezone';

export const TIMEZONE = 'America/Lima';
const pad = (n: number) => String(n).padStart(2, '0');

export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const today = getTodayInTimezone(TIMEZONE);
const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
export const MONDAY = addDays(today, -weekday);
export const TODAY = today;

export type RuleType = 'REGULAR' | 'EXCEPTION' | 'EXTRA';
export interface Rule {
  id: number;
  specialtyId: number;
  dayIndex: number; // 0 = lunes
  timeFrom: string;
  timeTo: string;
  type: RuleType;
  startDate: string;
  endDate: string;
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const doctor = {
  id: 12,
  fullName: 'Lucía Paredes',
  specialties: [
    { id: 1, name: 'Medicina General', minutes: 20 },
    { id: 2, name: 'Cardiología', minutes: 30 },
  ],
};

export const specialtyName = (id: number) => doctor.specialties.find((s) => s.id === id)?.name ?? '';

export const initialRules: Rule[] = [
  { id: 1, specialtyId: 1, dayIndex: 0, timeFrom: '08:00', timeTo: '12:00', type: 'REGULAR', startDate: addDays(MONDAY, -28), endDate: addDays(MONDAY, 120) },
  { id: 2, specialtyId: 1, dayIndex: 2, timeFrom: '08:00', timeTo: '12:00', type: 'REGULAR', startDate: addDays(MONDAY, -28), endDate: addDays(MONDAY, 120) },
  { id: 3, specialtyId: 1, dayIndex: 4, timeFrom: '08:00', timeTo: '11:00', type: 'REGULAR', startDate: addDays(MONDAY, -28), endDate: addDays(MONDAY, 120) },
  { id: 4, specialtyId: 2, dayIndex: 1, timeFrom: '14:00', timeTo: '18:00', type: 'REGULAR', startDate: addDays(MONDAY, -28), endDate: addDays(MONDAY, 120) },
  { id: 5, specialtyId: 2, dayIndex: 3, timeFrom: '14:00', timeTo: '17:00', type: 'REGULAR', startDate: addDays(MONDAY, -28), endDate: addDays(MONDAY, 120) },
];

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

let nextId = 100;
const appointment = (date: string, startTime: string, specialtyId: number, fullName: string, extra: Partial<AgendaAppointment> = {}): AgendaAppointment => {
  const minutes = doctor.specialties.find((s) => s.id === specialtyId)!.minutes;
  return {
    id: nextId++,
    scheduleId: specialtyId * 1000,
    doctorId: doctor.id,
    specialtyId,
    date,
    startTime,
    endTime: toTime(toMin(startTime) + minutes),
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: 'PAID',
    isOverbook: false,
    isAtRisk: false,
    patient: { id: nextId, fullName },
    ...extra,
  };
};

const W = (week: number, day: number) => addDays(MONDAY, week * 7 + day);

export const appointments: AgendaAppointment[] = [
  appointment(W(0, 0), '08:00', 1, 'Ana Torres'),
  appointment(W(0, 0), '08:40', 1, 'Bruno Salazar', { paymentStatus: 'PENDING', status: AppointmentStatus.PENDING }),
  appointment(W(0, 1), '14:00', 2, 'Carla Gómez'),
  appointment(W(0, 1), '15:00', 2, 'Diego Herrera', { paymentStatus: 'PARTIAL' }),
  appointment(W(0, 2), '09:00', 1, 'Elena Vargas'),
  appointment(W(0, 3), '14:30', 2, 'Fernando Ríos'),
  appointment(W(0, 4), '08:20', 1, 'Gabriela Castro', { paymentStatus: 'PENDING', status: AppointmentStatus.PENDING }),
  appointment(W(1, 0), '08:00', 1, 'Hugo Medina'),
  appointment(W(1, 0), '10:00', 1, 'Isabel Núñez', { paymentStatus: 'PARTIAL' }),
  appointment(W(1, 1), '16:00', 2, 'Javier Ortiz'),
  appointment(W(1, 2), '08:40', 1, 'Karen León'),
  appointment(W(1, 3), '14:00', 2, 'Luis Pérez'),
  appointment(W(2, 1), '14:30', 2, 'María Soto'),
];

export const blocks: AgendaBlock[] = [
  { id: 7, doctorId: doctor.id, type: 'TIME_RANGE', startDate: W(0, 2), endDate: W(0, 2), timeFrom: '10:00', timeTo: '12:00', reason: 'Reunión de servicio' },
  { id: 8, doctorId: doctor.id, type: 'FULL_DAY', startDate: W(2, 2), endDate: W(2, 4), timeFrom: null, timeTo: null, reason: 'Congreso de cardiología' },
];

export const holidays: AgendaHoliday[] = [
  { id: 3, date: W(1, 4), name: 'Aniversario de la sede', scope: 'CLINIC' },
  { id: 4, date: W(3, 3), name: 'Día de Todos los Santos', scope: 'GLOBAL' },
];

/** Cupos que generarían las reglas en 5 semanas; los ocupados, bloqueados o de feriado no quedan libres. */
export function cuposFrom(rules: Rule[], restrictions: { blocks: AgendaBlock[]; holidays: AgendaHoliday[] } = { blocks, holidays }): AgendaCupo[] {
  const out: AgendaCupo[] = [];
  for (let week = -1; week < 5; week += 1) {
    for (const rule of rules) {
      const date = W(week, rule.dayIndex);
      if (date < rule.startDate || date > rule.endDate) continue;
      const minutes = doctor.specialties.find((s) => s.id === rule.specialtyId)!.minutes;
      for (let m = toMin(rule.timeFrom); m + minutes <= toMin(rule.timeTo); m += minutes) {
        const startTime = toTime(m);
        const endTime = toTime(m + minutes);
        const taken = appointments.some((a) => a.date === date && a.startTime === startTime);
        const blocked = restrictions.blocks.some(
          (b) => b.startDate <= date && date <= b.endDate && (b.type === 'FULL_DAY' || (b.timeFrom! < endTime && startTime < b.timeTo!)),
        );
        const holiday = restrictions.holidays.some((h) => h.date === date);
        out.push({ scheduleId: rule.specialtyId * 1000, doctorId: doctor.id, specialtyId: rule.specialtyId, date, startTime, endTime, available: !taken && !blocked && !holiday });
      }
    }
  }
  return out;
}

export function snapshotFor(rules: Rule[], extraBlocks: AgendaBlock[] = []): AgendaSnapshot {
  const allBlocks = [...blocks, ...extraBlocks];
  return {
    timezone: TIMEZONE,
    range: { from: W(-1, 0), to: W(5, 6) },
    doctors: [{ id: doctor.id, fullName: doctor.fullName, specialties: doctor.specialties.map(({ id, name }) => ({ id, name })) }],
    cupos: cuposFrom(rules, { blocks: allBlocks, holidays }),
    appointments,
    blocks: allBlocks,
    holidays,
    indicators: {
      totalCupos: 0,
      bookedCupos: 0,
      occupancyRate: 0,
      byStatus: { PENDING: 0, CONFIRMED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 },
      atRisk: 0,
      pendingPayment: 0,
    },
  };
}

export interface RestrictionDraft {
  type: 'FULL_DAY' | 'TIME_RANGE';
  startDate: string;
  endDate: string;
  timeFrom: string | null;
  timeTo: string | null;
}

/** Vista previa de impacto (M1 simulado): citas activas que caerían dentro de la restricción. */
export function impactOf(draft: RestrictionDraft): AgendaAppointment[] {
  const active: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
  return appointments.filter(
    (a) =>
      active.includes(a.status) &&
      draft.startDate <= a.date &&
      a.date <= draft.endDate &&
      (draft.type === 'FULL_DAY' || (draft.timeFrom! < a.endTime && a.startTime < draft.timeTo!)),
  );
}

/** Citas que dejarían de tener regla si las reglas cambian (impacto de un reemplazo). */
export function impactOfRules(rules: Rule[]): AgendaAppointment[] {
  return appointments.filter((a) => {
    const dayIndex = (new Date(`${a.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    return (
      a.date >= TODAY &&
      !rules.some((r) => r.specialtyId === a.specialtyId && r.dayIndex === dayIndex && r.timeFrom <= a.startTime && a.endTime <= r.timeTo)
    );
  });
}

export const PAYMENT_LABEL: Record<string, string> = {
  PAID: 'Pagada: queda con reembolso pendiente',
  PARTIAL: 'Con seña: queda con reembolso pendiente',
  PENDING: 'Sin pagar',
};

export const dayTitle = (date: string) =>
  new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
