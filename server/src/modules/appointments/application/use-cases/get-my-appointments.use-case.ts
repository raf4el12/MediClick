import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { PaginatedAppointmentResponseDto } from '../dto/paginated-appointment-response.dto.js';
import { MyAppointmentsFilterDto } from '../dto/my-appointments-filter.dto.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { toPatientAppointmentResponse } from '../mappers/patient-appointment.mapper.js';
import {
  upcomingAppointments,
  upcomingFromDate,
} from '../services/patient-upcoming.js';

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

    // "Próximas" comparte la definición del resumen: el instante real de cada cita
    // en la zona de su sede, ordenado entre sedes. Son pocas: se pagina en memoria.
    if (filterDto.upcoming) {
      const now = new Date();
      const { appointments } =
        await this.appointmentRepository.findPatientSummarySource(
          patient.id,
          upcomingFromDate(now),
        );
      const upcoming = upcomingAppointments(appointments, now).filter(
        (a) =>
          (!filterDto.status || a.status === filterDto.status) &&
          (!filterDto.statuses?.length ||
            filterDto.statuses.includes(a.status)),
      );
      return {
        totalRows: upcoming.length,
        rows: upcoming
          .slice(offset, offset + limit)
          .map(toPatientAppointmentResponse),
        totalPages: Math.ceil(upcoming.length / limit),
        currentPage: Math.floor(offset / limit) + 1,
      };
    }

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
        ...(filterDto.statuses?.length && { statuses: filterDto.statuses }),
      },
    );

    const rows: AppointmentResponseDto[] = result.rows.map(
      toPatientAppointmentResponse,
    );

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
