import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreateScheduleBlockDto } from '../../application/dto/create-schedule-block.dto.js';
import { UpdateScheduleBlockDto } from '../../application/dto/update-schedule-block.dto.js';
import { FindAllScheduleBlocksQueryDto } from '../../application/dto/find-all-schedule-blocks-query.dto.js';
import { ScheduleBlockResponseDto } from '../../application/dto/schedule-block-response.dto.js';
import { PaginatedScheduleBlockResponseDto } from '../../application/dto/paginated-schedule-block-response.dto.js';
import { CreateScheduleBlockUseCase } from '../../application/use-cases/create-schedule-block.use-case.js';
import { FindAllScheduleBlocksUseCase } from '../../application/use-cases/find-all-schedule-blocks.use-case.js';
import { UpdateScheduleBlockUseCase } from '../../application/use-cases/update-schedule-block.use-case.js';
import { DeleteScheduleBlockUseCase } from '../../application/use-cases/delete-schedule-block.use-case.js';

@ApiTags('Schedule Blocks')
@Controller('schedule-blocks')
export class ScheduleBlockController {
  constructor(
    private readonly createScheduleBlockUseCase: CreateScheduleBlockUseCase,
    private readonly findAllScheduleBlocksUseCase: FindAllScheduleBlocksUseCase,
    private readonly updateScheduleBlockUseCase: UpdateScheduleBlockUseCase,
    private readonly deleteScheduleBlockUseCase: DeleteScheduleBlockUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Crear un bloqueo de horario para un doctor' })
  @ApiResponse({
    status: 201,
    description: 'Bloqueo de horario creado exitosamente',
    type: ScheduleBlockResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  async create(
    @Body() dto: CreateScheduleBlockDto,
  ): Promise<ScheduleBlockResponseDto> {
    return this.createScheduleBlockUseCase.execute(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Listar bloqueos de horario con paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de bloqueos de horario',
    type: PaginatedScheduleBlockResponseDto,
  })
  async findAll(
    @Query() queryDto: FindAllScheduleBlocksQueryDto,
  ): Promise<PaginatedScheduleBlockResponseDto> {
    const pagination = new PaginationImproved(
      queryDto.searchValue,
      queryDto.currentPage,
      queryDto.pageSize,
      queryDto.orderBy,
      queryDto.orderByMode,
    );
    return this.findAllScheduleBlocksUseCase.execute(
      pagination,
      queryDto.doctorId,
    );
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Actualizar un bloqueo de horario' })
  @ApiResponse({
    status: 200,
    description: 'Bloqueo de horario actualizado',
    type: ScheduleBlockResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Bloqueo de horario no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleBlockDto,
  ): Promise<ScheduleBlockResponseDto> {
    return this.updateScheduleBlockUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Eliminar un bloqueo de horario (soft delete)' })
  @ApiResponse({ status: 204, description: 'Bloqueo de horario eliminado' })
  @ApiResponse({ status: 404, description: 'Bloqueo de horario no encontrado' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteScheduleBlockUseCase.execute(id);
  }
}
