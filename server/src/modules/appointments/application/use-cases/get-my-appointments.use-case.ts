import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { PaginatedAppointmentResponseDto } from '../dto/paginated-appointment-response.dto.js';
import { MyAppointmentsFilterDto } from '../dto/my-appointments-filter.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class GetMyAppointmentsUseCase {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    userId: number,
    pagination: PaginationImproved,
    filterDto: MyAppointmentsFilterDto,
  ): Promise<PaginatedAppointmentResponseDto> {
    // Buscar paciente asociado al userId autenticado
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundException(
        'No se encontró un perfil de paciente asociado a tu cuenta',
      );
    }

    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.appointmentRepository.findByPatientPaginated(
      patient.id,
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      {
        ...(filterDto.status && { status: filterDto.status }),
        ...(filterDto.upcoming !== undefined && {
          upcoming: filterDto.upcoming,
        }),
      },
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
