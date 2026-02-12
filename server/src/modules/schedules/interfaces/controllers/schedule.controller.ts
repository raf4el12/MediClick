import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { FindAllSchedulesQueryDto } from '../../application/dto/find-all-schedules-query.dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { GenerateSchedulesDto } from '../../application/dto/generate-schedules.dto.js';
import { GenerateSchedulesResponseDto } from '../../application/dto/generate-schedules-response.dto.js';
import { PaginatedScheduleResponseDto } from '../../application/dto/paginated-schedule-response.dto.js';
import { GenerateSchedulesUseCase } from '../../application/use-cases/generate-schedules.use-case.js';
import { FindAllSchedulesUseCase } from '../../application/use-cases/find-all-schedules.use-case.js';

@ApiTags('Schedules')
@Controller('schedules')
export class ScheduleController {
  constructor(
    private readonly generateSchedulesUseCase: GenerateSchedulesUseCase,
    private readonly findAllSchedulesUseCase: FindAllSchedulesUseCase,
  ) {}

  @Post('generate')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Generar horarios concretos basados en disponibilidad',
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
    });
  }
}
