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
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../../../shared/decorators/index.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreateAppointmentDto } from '../../application/dto/create-appointment.dto.js';
import { AppointmentDashboardFilterDto } from '../../application/dto/appointment-dashboard-filter.dto.js';
import { RescheduleAppointmentDto } from '../../application/dto/reschedule-appointment.dto.js';
import { CancelAppointmentDto } from '../../application/dto/cancel-appointment.dto.js';
import { AppointmentResponseDto } from '../../application/dto/appointment-response.dto.js';
import { PaginatedAppointmentResponseDto } from '../../application/dto/paginated-appointment-response.dto.js';
import { CreateAppointmentUseCase } from '../../application/use-cases/create-appointment.use-case.js';
import { GetDashboardAppointmentsUseCase } from '../../application/use-cases/get-dashboard-appointments.use-case.js';
import { GetDoctorDailyAppointmentsUseCase } from '../../application/use-cases/get-doctor-daily-appointments.use-case.js';
import { CheckInAppointmentUseCase } from '../../application/use-cases/check-in-appointment.use-case.js';
import { CancelAppointmentUseCase } from '../../application/use-cases/cancel-appointment.use-case.js';
import { RescheduleAppointmentUseCase } from '../../application/use-cases/reschedule-appointment.use-case.js';
import { ConfirmAppointmentUseCase } from '../../application/use-cases/confirm-appointment.use-case.js';
import { CreateOverbookAppointmentUseCase } from '../../application/use-cases/create-overbook-appointment.use-case.js';
import { CompleteAppointmentUseCase } from '../../application/use-cases/complete-appointment.use-case.js';
import { GetMyAppointmentsUseCase } from '../../application/use-cases/get-my-appointments.use-case.js';
import { CreatePatientAppointmentUseCase } from '../../application/use-cases/create-patient-appointment.use-case.js';
import { CreateOverbookAppointmentDto } from '../../application/dto/create-overbook-appointment.dto.js';
import { MyAppointmentsFilterDto } from '../../application/dto/my-appointments-filter.dto.js';
import { CreatePatientAppointmentDto } from '../../application/dto/create-patient-appointment.dto.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { CurrentClinic } from '../../../../shared/decorators/current-clinic.decorator.js';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly getDashboardAppointmentsUseCase: GetDashboardAppointmentsUseCase,
    private readonly getDoctorDailyAppointmentsUseCase: GetDoctorDailyAppointmentsUseCase,
    private readonly checkInAppointmentUseCase: CheckInAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly createOverbookAppointmentUseCase: CreateOverbookAppointmentUseCase,
    private readonly rescheduleAppointmentUseCase: RescheduleAppointmentUseCase,
    private readonly completeAppointmentUseCase: CompleteAppointmentUseCase,
    private readonly getMyAppointmentsUseCase: GetMyAppointmentsUseCase,
    private readonly createPatientAppointmentUseCase: CreatePatientAppointmentUseCase,
  ) {}

  @Get('my')
  @Auth()
  @RequirePermissions('READ', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Mis citas (paciente autenticado)' })
  @ApiResponse({ status: 200, type: PaginatedAppointmentResponseDto })
  @ApiResponse({ status: 404, description: 'Perfil de paciente no encontrado' })
  async getMyAppointments(
    @CurrentUser('id') userId: number,
    @Query() filterDto: MyAppointmentsFilterDto,
  ): Promise<PaginatedAppointmentResponseDto> {
    const pagination = new PaginationImproved(
      filterDto.searchValue,
      filterDto.currentPage,
      filterDto.pageSize,
      filterDto.orderBy,
      filterDto.orderByMode,
    );
    return this.getMyAppointmentsUseCase.execute(userId, pagination, filterDto);
  }

  @Post('patient')
  @Auth()
  @RequirePermissions('CREATE', 'APPOINTMENTS')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Reservar cita como paciente (auto-asigna patientId)',
  })
  @ApiResponse({
    status: 201,
    description: 'Cita creada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Horario inválido' })
  @ApiResponse({ status: 404, description: 'Perfil de paciente no encontrado' })
  @ApiResponse({ status: 409, description: 'Horario ya tiene cita asignada' })
  async createAsPatient(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePatientAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.createPatientAppointmentUseCase.execute(userId, dto);
  }

  @Post()
  @Auth()
  @RequirePermissions('CREATE', 'APPOINTMENTS')
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Crear cita médica' })
  @ApiResponse({
    status: 201,
    description: 'Cita creada',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Paciente u horario inválido' })
  @ApiResponse({ status: 409, description: 'Horario ya tiene cita asignada' })
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<AppointmentResponseDto> {
    return this.createAppointmentUseCase.execute(dto, clinicId);
  }

  @Post('overbook')
  @Auth()
  @RequirePermissions('CREATE', 'APPOINTMENTS')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Crear cita de sobrecupo (al final del último slot del día)',
  })
  @ApiResponse({
    status: 201,
    description: 'Sobrecupo creado',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o fecha pasada' })
  @ApiResponse({
    status: 409,
    description: 'Límite de sobrecupos alcanzado',
  })
  async createOverbook(
    @Body() dto: CreateOverbookAppointmentDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<AppointmentResponseDto> {
    return this.createOverbookAppointmentUseCase.execute(dto, clinicId);
  }

  @Get('doctor/today')
  @Auth()
  @RequirePermissions('READ', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Citas del doctor autenticado para hoy' })
  @ApiResponse({ status: 200, type: [AppointmentResponseDto] })
  async getDoctorDaily(
    @CurrentUser('id') userId: number,
  ): Promise<AppointmentResponseDto[]> {
    return this.getDoctorDailyAppointmentsUseCase.execute(userId);
  }

  @Get()
  @Auth()
  @RequirePermissions('READ', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Dashboard de citas con filtros' })
  @ApiResponse({ status: 200, type: PaginatedAppointmentResponseDto })
  async findAll(
    @CurrentUser('id') userId: number,
    @CurrentUser('roleName') role: string,
    @CurrentClinic() clinicId: number | null,
    @Query() filterDto: AppointmentDashboardFilterDto,
  ): Promise<PaginatedAppointmentResponseDto> {
    const pagination = new PaginationImproved(
      filterDto.searchValue,
      filterDto.currentPage,
      filterDto.pageSize,
      filterDto.orderBy,
      filterDto.orderByMode,
    );
    return this.getDashboardAppointmentsUseCase.execute(
      pagination,
      filterDto,
      userId,
      role,
      clinicId,
    );
  }

  @Patch(':id/check-in')
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
  @ApiOperation({
    summary: 'Check-in de paciente (PENDING/CONFIRMED → IN_PROGRESS)',
  })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Estado no permite check-in' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AppointmentResponseDto> {
    return this.checkInAppointmentUseCase.execute(id);
  }

  @Patch(':id/cancel')
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
  @ApiOperation({
    summary:
      'Cancelar cita (pacientes pueden cancelar con política de penalización)',
  })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'No se puede cancelar' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser('roleName') userRole: string,
  ): Promise<AppointmentResponseDto> {
    return this.cancelAppointmentUseCase.execute(id, dto, userRole);
  }

  @Patch(':id/confirm')
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Confirmar cita (PENDING → CONFIRMED)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Estado no permite confirmación' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async confirm(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AppointmentResponseDto> {
    return this.confirmAppointmentUseCase.execute(id);
  }

  @Patch(':id/reschedule')
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
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
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
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
