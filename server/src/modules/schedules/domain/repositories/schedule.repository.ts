import {
  ScheduleWithRelations,
  ScheduleWithAvailability,
  ScheduleWithBookedSlots,
  CreateScheduleData,
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
  ): Promise<{ scheduleDate: Date; timeFrom: Date; timeTo: Date }[]>;

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
   * Devuelve los horarios de un doctor para una fecha y especialidad,
   * junto con los rangos exactos (startTime, endTime) de las citas activas.
   */
  findByDoctorDateWithBookedSlots(
    doctorId: number,
    date: Date,
    specialtyId: number,
  ): Promise<ScheduleWithBookedSlots[]>;
}
