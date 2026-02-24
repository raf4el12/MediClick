import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { FindAllSchedulesQueryDto } from '../../application/dto/find-all-schedules-query.dto.js';
import { GetTimeSlotsQueryDto } from '../../application/dto/get-time-slots-query.dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { GenerateSchedulesDto } from '../../application/dto/generate-schedules.dto.js';
import { GenerateSchedulesResponseDto } from '../../application/dto/generate-schedules-response.dto.js';
import { PaginatedScheduleResponseDto } from '../../application/dto/paginated-schedule-response.dto.js';
import { TimeSlotResponseDto } from '../../application/dto/time-slot-response.dto.js';
import { GenerateSchedulesUseCase } from '../../application/use-cases/generate-schedules.use-case.js';
import { FindAllSchedulesUseCase } from '../../application/use-cases/find-all-schedules.use-case.js';
import { GetAvailableTimeSlotsUseCase } from '../../application/use-cases/get-available-time-slots.use-case.js';

@ApiTags('Schedules')
@Controller('schedules')
export class ScheduleController {
  constructor(
    private readonly generateSchedulesUseCase: GenerateSchedulesUseCase,
    private readonly findAllSchedulesUseCase: FindAllSchedulesUseCase,
    private readonly getAvailableTimeSlotsUseCase: GetAvailableTimeSlotsUseCase,
  ) {}

  @Post('generate')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Generar horarios concretos basados en disponibilidad',
    description:
      'Fragmenta cada regla de disponibilidad en time slots individuales ' +
      'según la duración configurada en la especialidad (Specialties.duration). ' +
      'Si la especialidad no tiene duración configurada, crea un único slot con el rango completo.',
  })
  @ApiResponse({
    status: 201,
    description: 'Horarios generados',
    type: GenerateSchedulesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos o doctor no encontrado',
  })
  async generate(
    @Body() dto: GenerateSchedulesDto,
  ): Promise<GenerateSchedulesResponseDto> {
    return this.generateSchedulesUseCase.execute(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Listar horarios con paginación y filtros' })
  @ApiQuery({ name: 'doctorId', required: false, type: Number })
  @ApiQuery({ name: 'specialtyId', required: false, type: Number })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Fecha inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Fecha fin (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de horarios',
    type: PaginatedScheduleResponseDto,
  })
  async findAll(
    @Query() queryDto: FindAllSchedulesQueryDto,
  ): Promise<PaginatedScheduleResponseDto> {
    const pagination = new PaginationImproved(
      queryDto.searchValue,
      queryDto.currentPage,
      queryDto.pageSize,
      queryDto.orderBy,
      queryDto.orderByMode,
    );

    return this.findAllSchedulesUseCase.execute(pagination, {
      doctorId: queryDto.doctorId,
      specialtyId: queryDto.specialtyId,
      dateFrom: queryDto.dateFrom,
      dateTo: queryDto.dateTo,
      onlyAvailable: queryDto.onlyAvailable,
    });
  }

  @Get('time-slots')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Obtener time slots disponibles para un doctor en una fecha',
    description:
      'Busca los bloques horarios del doctor para la fecha y especialidad dadas, ' +
      'obtiene la duración de la especialidad, fragmenta cada bloque en slots y ' +
      'cruza con las citas existentes para indicar disponibilidad.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array de time slots con estado de disponibilidad',
    type: TimeSlotResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async getAvailableTimeSlots(
    @Query() queryDto: GetTimeSlotsQueryDto,
  ): Promise<TimeSlotResponseDto[]> {
    return this.getAvailableTimeSlotsUseCase.execute(queryDto);
  }
}
