import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreateAppointmentDto } from '../../application/dto/create-appointment.dto.js';
import { AppointmentDashboardFilterDto } from '../../application/dto/appointment-dashboard-filter.dto.js';
import { RescheduleAppointmentDto } from '../../application/dto/reschedule-appointment.dto.js';
import { CancelAppointmentDto } from '../../application/dto/cancel-appointment.dto.js';
import { AppointmentResponseDto } from '../../application/dto/appointment-response.dto.js';
import { PaginatedAppointmentResponseDto } from '../../application/dto/paginated-appointment-response.dto.js';
import { CreateAppointmentUseCase } from '../../application/use-cases/create-appointment.use-case.js';
import { GetDashboardAppointmentsUseCase } from '../../application/use-cases/get-dashboard-appointments.use-case.js';
import { CheckInAppointmentUseCase } from '../../application/use-cases/check-in-appointment.use-case.js';
import { CancelAppointmentUseCase } from '../../application/use-cases/cancel-appointment.use-case.js';
import { RescheduleAppointmentUseCase } from '../../application/use-cases/reschedule-appointment.use-case.js';
import { CompleteAppointmentUseCase } from '../../application/use-cases/complete-appointment.use-case.js';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly getDashboardAppointmentsUseCase: GetDashboardAppointmentsUseCase,
    private readonly checkInAppointmentUseCase: CheckInAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly rescheduleAppointmentUseCase: RescheduleAppointmentUseCase,
    private readonly completeAppointmentUseCase: CompleteAppointmentUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Crear cita médica' })
  @ApiResponse({ status: 201, description: 'Cita creada', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Paciente u horario inválido' })
  @ApiResponse({ status: 409, description: 'Horario ya tiene cita asignada' })
  async create(
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.createAppointmentUseCase.execute(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Dashboard de citas con filtros' })
  @ApiResponse({ status: 200, type: PaginatedAppointmentResponseDto })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: AppointmentDashboardFilterDto,
  ): Promise<PaginatedAppointmentResponseDto> {
    const pagination = new PaginationImproved(
      paginationDto.searchValue,
      paginationDto.currentPage,
      paginationDto.pageSize,
      paginationDto.orderBy,
      paginationDto.orderByMode,
    );
    return this.getDashboardAppointmentsUseCase.execute(pagination, filterDto);
  }

  @Patch(':id/check-in')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Check-in de paciente (PENDING/CONFIRMED → IN_PROGRESS)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Estado no permite check-in' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AppointmentResponseDto> {
    return this.checkInAppointmentUseCase.execute(id);
  }

  @Patch(':id/cancel')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancelar cita' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'No se puede cancelar' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.cancelAppointmentUseCase.execute(id, dto);
  }

  @Patch(':id/reschedule')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Reagendar cita a otro horario' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Estado no permite reagendar' })
  @ApiResponse({ status: 409, description: 'Nuevo horario ya ocupado' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.rescheduleAppointmentUseCase.execute(id, dto);
  }

  @Patch(':id/complete')
  @Auth(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Completar cita (IN_PROGRESS → COMPLETED)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Estado no permite completar' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async complete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AppointmentResponseDto> {
    return this.completeAppointmentUseCase.execute(id);
  }
}
