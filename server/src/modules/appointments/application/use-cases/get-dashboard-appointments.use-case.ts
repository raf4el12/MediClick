import { Injectable, Inject } from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { PaginatedAppointmentResponseDto } from '../dto/paginated-appointment-response.dto.js';
import { AppointmentDashboardFilterDto } from '../dto/appointment-dashboard-filter.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { DashboardFilters } from '../../domain/interfaces/appointment-data.interface.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class GetDashboardAppointmentsUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    filterDto: AppointmentDashboardFilterDto,
  ): Promise<PaginatedAppointmentResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const filters: DashboardFilters = {
      ...(filterDto.dateFrom && { dateFrom: new Date(filterDto.dateFrom) }),
      ...(filterDto.dateTo && { dateTo: new Date(filterDto.dateTo) }),
      ...(filterDto.doctorId && { doctorId: filterDto.doctorId }),
      ...(filterDto.specialtyId && { specialtyId: filterDto.specialtyId }),
      ...(filterDto.status && { status: filterDto.status }),
    };

    const result = await this.appointmentRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      filters,
    );

    const rows: AppointmentResponseDto[] = result.rows.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      scheduleId: a.scheduleId,
      startTime: dateToTimeString(a.startTime),
      endTime: dateToTimeString(a.endTime),
      reason: a.reason,
      notes: a.notes,
      status: a.status,
      paymentStatus: a.paymentStatus,
      amount: a.amount,
      cancelReason: a.cancelReason,
      patient: {
        id: a.patient.id,
        name: a.patient.profile.name,
        lastName: a.patient.profile.lastName,
        email: a.patient.profile.email,
      },
      schedule: {
        id: a.schedule.id,
        scheduleDate: a.schedule.scheduleDate,
        timeFrom: dateToTimeString(a.schedule.timeFrom),
        timeTo: dateToTimeString(a.schedule.timeTo),
        doctor: {
          id: a.schedule.doctor.id,
          name: a.schedule.doctor.profile.name,
          lastName: a.schedule.doctor.profile.lastName,
        },
        specialty: a.schedule.specialty,
      },
      createdAt: a.createdAt,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
