import type { AppointmentStatus } from '@/views/appointments/types';

/** Espejo de `AgendaResponseDto` (`GET /agenda`). Fechas `YYYY-MM-DD` y horas `HH:mm` en la zona de la sede. */
export interface AgendaSnapshot {
  timezone: string;
  range: DateRange;
  doctors: AgendaDoctor[];
  cupos: AgendaCupo[];
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
  holidays: AgendaHoliday[];
  indicators: AgendaIndicators;
}

export interface DateRange {
  from: string;
  to: string;
}

export type AgendaScope = { doctorId: number } | { clinicId: number } | Record<string, never>;

export interface AgendaDoctor {
  id: number;
  fullName: string;
  specialties: { id: number; name: string }[];
}

export interface AgendaCupo {
  scheduleId: number;
  doctorId: number;
  specialtyId: number;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AgendaAppointment {
  id: number;
  scheduleId: number;
  doctorId: number;
  specialtyId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  paymentStatus: string;
  isOverbook: boolean;
  isAtRisk: boolean;
  patient: { id: number; fullName: string };
}

export interface AgendaBlock {
  id: number;
  doctorId: number;
  type: 'FULL_DAY' | 'TIME_RANGE';
  startDate: string;
  endDate: string;
  timeFrom: string | null;
  timeTo: string | null;
  reason: string;
}

export interface AgendaHoliday {
  id: number;
  date: string;
  name: string;
  scope: 'GLOBAL' | 'CLINIC';
}

export interface AgendaIndicators {
  totalCupos: number;
  bookedCupos: number;
  occupancyRate: number;
  byStatus: Record<AppointmentStatus, number>;
  atRisk: number;
  pendingPayment: number;
}

/** Cupo de destino de un reagendamiento: lo que espera `PATCH /appointments/:id/reschedule`. */
export interface SlotTarget {
  scheduleId: number;
  startTime: string;
  endTime: string;
}

export type AgendaEventProps =
  | {
      kind: 'appointment';
      appointmentId: number;
      status: AppointmentStatus;
      paymentStatus: string;
      patientName: string;
    }
  | { kind: 'cupo'; scheduleId: number }
  | { kind: 'block'; blockId: number }
  | { kind: 'holiday'; holidayId: number };

/** Evento compatible con `EventInput` de FullCalendar, con fechas locales sin offset. */
export interface AgendaEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  display?: 'background';
  editable: boolean;
  classNames: string[];
  extendedProps: AgendaEventProps;
}
