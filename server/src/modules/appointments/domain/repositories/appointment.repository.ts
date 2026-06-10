import type {
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentWithRelations,
  DashboardFilters,
  PatientAppointmentFilters,
} from '../interfaces/appointment-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IAppointmentRepository {
  create(data: CreateAppointmentData): Promise<AppointmentWithRelations>;
  findAllPaginated(
    params: PaginationParams,
    filters: DashboardFilters,
  ): Promise<PaginatedResult<AppointmentWithRelations>>;
  findByPatientPaginated(
    patientId: number,
    params: PaginationParams,
    filters: PatientAppointmentFilters,
  ): Promise<PaginatedResult<AppointmentWithRelations>>;
  findById(id: number): Promise<AppointmentWithRelations | null>;
  update(
    id: number,
    data: UpdateAppointmentData,
  ): Promise<AppointmentWithRelations>;
  softDelete(id: number): Promise<void>;
  existsAppointmentForSchedule(
    scheduleId: number,
    excludeId?: number,
  ): Promise<boolean>;
  /**
   * Verifica si existe una cita activa del MISMO doctor en la MISMA fecha que se
   * superponga con el rango horario dado (a través de cualquier schedule, no solo
   * el indicado). Usa lógica de overlap: A.start < B.end AND A.end > B.start.
   */
  hasOverlappingAppointment(
    scheduleId: number,
    startTime: Date,
    endTime: Date,
    excludeId?: number,
  ): Promise<boolean>;
  findByDoctorAndDate(
    doctorId: number,
    date: Date,
  ): Promise<AppointmentWithRelations[]>;

  /**
   * Citas activas (no canceladas/no-show) de un doctor cuyo schedule cae en el
   * rango de fechas [dateFrom, dateTo]. Usado para invalidar citas al crear un
   * bloqueo de horario.
   */
  findActiveByDoctorAndDateRange(
    doctorId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AppointmentWithRelations[]>;

  /**
   * Citas activas (no canceladas/no-show) en una fecha concreta. Si se pasa
   * clinicId, se acota a esa sede; si es null/undefined, abarca todas (feriado
   * global). Usado para invalidar citas al crear un feriado.
   */
  findActiveByDateAndClinic(
    date: Date,
    clinicId?: number | null,
  ): Promise<AppointmentWithRelations[]>;

  /**
   * Cuenta las citas de sobrecupo activas de un doctor en una fecha específica.
   */
  countOverbooksByDoctorAndDate(doctorId: number, date: Date): Promise<number>;

  /**
   * Verifica overlap y crea la cita dentro de una transacción serializable.
   * Lanza ConflictException si hay superposición.
   */
  createWithOverlapCheck(
    data: CreateAppointmentData,
    startTime: Date,
    endTime: Date,
  ): Promise<AppointmentWithRelations>;

  /**
   * Reagenda una cita verificando overlap dentro de una transacción serializable.
   * Lanza ConflictException si hay superposición.
   */
  rescheduleWithOverlapCheck(
    id: number,
    data: UpdateAppointmentData,
    newScheduleId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<AppointmentWithRelations>;

  /**
   * Verifica el límite de sobrecupos y crea la cita dentro de una transacción serializable.
   * Lanza ConflictException si se excede el límite.
   */
  createOverbookAtomic(
    data: CreateAppointmentData,
    doctorId: number,
    date: Date,
    maxOverbookPerDay: number,
  ): Promise<AppointmentWithRelations>;
}
