import type { AppointmentStatus } from '@/views/appointments/types';

/** Parámetros de `GET /availability-restrictions/impact`, en el orden en que viajan. */
export interface RestrictionImpactQuery {
  type: 'FULL_DAY' | 'TIME_RANGE' | 'HOLIDAY';
  doctorId?: number;
  clinicId?: number;
  startDate: string;
  endDate: string;
  timeFrom?: string;
  timeTo?: string;
  excludeRestrictionId?: number;
}

export interface ImpactedAppointment {
  id: number;
  doctorId: number;
  doctorName: string;
  specialtyName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  paymentStatus: string;
  patient: { id: number; fullName: string };
}

export interface RestrictionImpact {
  total: number;
  withPayment: number;
  appointments: ImpactedAppointment[];
}

/** Borrador de bloqueo de agenda en el drawer (fechas y horas en la zona de la sede). */
export interface BlockDraft {
  id?: number;
  type: 'FULL_DAY' | 'TIME_RANGE';
  startDate: string;
  endDate: string;
  timeFrom: string;
  timeTo: string;
  reason: string;
}
