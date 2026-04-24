import { Injectable, Inject } from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { PaginatedAppointmentResponseDto } from '../dto/paginated-appointment-response.dto.js';
import { AppointmentDashboardFilterDto } from '../dto/appointment-dashboard-filter.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { DashboardFilters } from '../../domain/interfaces/appointment-data.interface.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class GetDashboardAppointmentsUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    filterDto: AppointmentDashboardFilterDto,
    userId?: number,
    role?: string,
    jwtClinicId?: number | null,
  ): Promise<PaginatedAppointmentResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    // Auto-filter by doctorId when the logged-in user is a DOCTOR
    let scopedDoctorId = filterDto.doctorId;
    if (role === UserRole.DOCTOR && userId) {
      const doctorId = await this.doctorRepository.findDoctorIdByUserId(userId);
      if (doctorId) {
        scopedDoctorId = doctorId;
      }
    }

    // JWT clinicId prevails over client-supplied for staff
    const effectiveClinicId = jwtClinicId ?? filterDto.clinicId;

    const filters: DashboardFilters = {
      ...(filterDto.dateFrom && { dateFrom: new Date(filterDto.dateFrom) }),
      ...(filterDto.dateTo && { dateTo: new Date(filterDto.dateTo) }),
      ...(scopedDoctorId && { doctorId: scopedDoctorId }),
      ...(filterDto.specialtyId && { specialtyId: filterDto.specialtyId }),
      ...(filterDto.status && { status: filterDto.status }),
      ...(effectiveClinicId && { clinicId: effectiveClinicId }),
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
      cancellationFee: a.cancellationFee,
      isOverbook: a.isOverbook,
      pendingUntil: a.pendingUntil ?? null,
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
      timezone: a.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
      hasPrescription: a.hasPrescription,
      notesCount: a.notesCount,
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
