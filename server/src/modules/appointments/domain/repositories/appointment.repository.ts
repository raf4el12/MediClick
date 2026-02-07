import {
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentWithRelations,
  DashboardFilters,
} from '../interfaces/appointment-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IAppointmentRepository {
  create(data: CreateAppointmentData): Promise<AppointmentWithRelations>;
  findAllPaginated(
    params: PaginationParams,
    filters: DashboardFilters,
  ): Promise<PaginatedResult<AppointmentWithRelations>>;
  findById(id: number): Promise<AppointmentWithRelations | null>;
  update(
    id: number,
    data: UpdateAppointmentData,
  ): Promise<AppointmentWithRelations>;
  softDelete(id: number): Promise<void>;
  existsAppointmentForSchedule(scheduleId: number, excludeId?: number): Promise<boolean>;
  findByDoctorAndDate(
    doctorId: number,
    date: Date,
  ): Promise<AppointmentWithRelations[]>;
}
