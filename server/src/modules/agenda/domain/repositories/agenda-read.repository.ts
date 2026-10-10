import type { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';
import type {
  AgendaScope,
  AgendaScopeLookups,
} from '../services/agenda-scope.policy.js';

export interface AgendaDoctorRow {
  id: number;
  name: string;
  lastName: string;
  specialties: { id: number; name: string }[];
}

/** Bloque de agenda con la duración y el descanso de su especialidad. */
export interface AgendaScheduleRow {
  id: number;
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
  durationMinutes: number;
  bufferMinutes: number;
}

export interface AgendaAppointmentRow {
  id: number;
  scheduleId: number;
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  paymentStatus: string;
  isOverbook: boolean;
  isAtRisk: boolean;
  pendingUntil: Date | null;
  patient: { id: number; name: string; lastName: string };
}

export interface AgendaBlockRow {
  id: number;
  doctorId: number;
  type: ScheduleBlockType;
  startDate: Date;
  endDate: Date;
  timeFrom: Date | null;
  timeTo: Date | null;
  reason: string;
}

export interface AgendaHolidayRow {
  id: number;
  date: Date;
  name: string;
  clinicId: number | null;
}

export interface AgendaRows {
  timezone: string;
  doctors: AgendaDoctorRow[];
  schedules: AgendaScheduleRow[];
  /** Todas las no borradas del rango, con cualquier estado. */
  appointments: AgendaAppointmentRow[];
  /** Bloqueos activos que se solapan con el rango. */
  blocks: AgendaBlockRow[];
  /** Feriados activos globales y de la sede del alcance; nunca de otra sede. */
  holidays: AgendaHolidayRow[];
}

export interface IAgendaReadRepository extends AgendaScopeLookups {
  /** `from` y `to` son días de agenda (medianoche UTC), ambos inclusive. */
  load(scope: AgendaScope, from: Date, to: Date): Promise<AgendaRows>;
}
