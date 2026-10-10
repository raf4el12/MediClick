import type { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';

export interface ImpactAppointmentRow {
  id: number;
  doctorId: number;
  doctor: { name: string; lastName: string };
  specialtyName: string;
  /** Sede de la cita o, si no la tiene, la del médico (como el listener). */
  clinicId: number | null;
  scheduleDate: Date;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  paymentStatus: string;
  patient: { id: number; name: string; lastName: string };
}

export interface ImpactBlockRow {
  id: number;
  type: ScheduleBlockType;
  startDate: Date;
  endDate: Date;
  timeFrom: Date | null;
  timeTo: Date | null;
}

export interface ImpactHolidayRow {
  id: number;
  date: Date;
  clinicId: number | null;
}

/**
 * Citas candidatas, con el mismo filtro que usa el listener: las de un médico
 * (bloqueo), las de una sede por `appointments.clinicId` (feriado de sede) o
 * las de todas las sedes (feriado global).
 */
export type ImpactAppointmentFilter =
  | { doctorId: number }
  | { clinicId: number }
  | { allClinics: true };

export interface IRestrictionImpactRepository {
  /** Citas no borradas del rango, con cualquier estado; `from` y `to` son días de agenda inclusive. */
  findAppointments(
    filter: ImpactAppointmentFilter,
    from: Date,
    to: Date,
  ): Promise<ImpactAppointmentRow[]>;
  /** Bloqueos activos del médico que se solapan con el rango. */
  findBlocks(doctorId: number, from: Date, to: Date): Promise<ImpactBlockRow[]>;
  /** Bloqueo activo del médico, o null si no existe o es de otro médico. */
  findBlock(blockId: number, doctorId: number): Promise<ImpactBlockRow | null>;
  /** Feriados activos del rango, globales y de cualquier sede. */
  findHolidays(from: Date, to: Date): Promise<ImpactHolidayRow[]>;
  /** Feriado activo, o null si no existe. */
  findHoliday(holidayId: number): Promise<ImpactHolidayRow | null>;
}
