import {
  ScheduleWithRelations,
  ScheduleWithAvailability,
  ScheduleWindow,
  CreateScheduleData,
  DoctorBooking,
} from '../interfaces/schedule-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IScheduleRepository {
  createMany(data: CreateScheduleData[]): Promise<number>;
  findAllPaginated(
    params: PaginationParams,
    filters: {
      doctorId?: number;
      specialtyId?: number;
      dateFrom?: Date;
      dateTo?: Date;
      onlyAvailable?: boolean;
      timezone?: string;
      clinicId?: number;
    },
  ): Promise<PaginatedResult<ScheduleWithRelations>>;
  findById(id: number): Promise<ScheduleWithRelations | null>;
  existsSchedule(
    doctorId: number,
    scheduleDate: Date,
    timeFrom: Date,
    timeTo: Date,
  ): Promise<boolean>;
  findExistingDates(
    doctorId: number,
    dates: Date[],
  ): Promise<
    {
      specialtyId: number;
      clinicId: number | null;
      scheduleDate: Date;
      timeFrom: Date;
      timeTo: Date;
    }[]
  >;

  /**
   * Elimina los schedules de un doctor en un rango de fechas que NO tienen
   * citas activas asociadas (preserva los que ya fueron reservados).
   * Retorna la cantidad de registros eliminados.
   */
  deleteUnbookedByDoctorAndDateRange(
    doctorId: number,
    dateFrom: Date,
    dateTo: Date,
    specialtyId?: number,
  ): Promise<number>;

  /**
   * Devuelve todos los horarios de un doctor para una fecha específica,
   * indicando si cada uno ya tiene una cita activa asignada.
   * Ordenados por timeFrom ASC.
   */
  findByDoctorAndDate(
    doctorId: number,
    date: Date,
    specialtyId?: number,
  ): Promise<ScheduleWithAvailability[]>;

  /**
   * Bloques de agenda del médico para una especialidad entre dos días de
   * agenda inclusive, ordenados por fecha y hora de inicio.
   */
  findByDoctorRange(
    doctorId: number,
    from: Date,
    to: Date,
    specialtyId: number,
  ): Promise<ScheduleWindow[]>;

  /**
   * Citas activas (no eliminadas, ni canceladas ni inasistencias) del médico
   * entre dos días de agenda inclusive, de cualquier especialidad: un médico
   * no puede tener citas solapadas aunque sean de especialidades distintas.
   */
  findDoctorBookingsInRange(
    doctorId: number,
    from: Date,
    to: Date,
  ): Promise<DoctorBooking[]>;
}
