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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Auth, CurrentClinic } from '../../../../shared/decorators/index.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { FindAllAvailabilityQueryDto } from '../../application/dto/find-all-availability-query.dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreateAvailabilityDto } from '../../application/dto/create-availability.dto.js';
import { BulkSaveAvailabilityDto } from '../../application/dto/bulk-save-availability.dto.js';
import { UpdateAvailabilityDto } from '../../application/dto/update-availability.dto.js';
import { AvailabilityResponseDto } from '../../application/dto/availability-response.dto.js';
import { PaginatedAvailabilityResponseDto } from '../../application/dto/paginated-availability-response.dto.js';
import { CreateAvailabilityUseCase } from '../../application/use-cases/create-availability.use-case.js';
import { BulkSaveAvailabilityUseCase } from '../../application/use-cases/bulk-save-availability.use-case.js';
import { FindAllAvailabilityUseCase } from '../../application/use-cases/find-all-availability.use-case.js';
import { UpdateAvailabilityUseCase } from '../../application/use-cases/update-availability.use-case.js';
import { DeleteAvailabilityUseCase } from '../../application/use-cases/delete-availability.use-case.js';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly createAvailabilityUseCase: CreateAvailabilityUseCase,
    private readonly bulkSaveAvailabilityUseCase: BulkSaveAvailabilityUseCase,
    private readonly findAllAvailabilityUseCase: FindAllAvailabilityUseCase,
    private readonly updateAvailabilityUseCase: UpdateAvailabilityUseCase,
    private readonly deleteAvailabilityUseCase: DeleteAvailabilityUseCase,
  ) {}

  @Post('bulk-save')
  @Auth()
  @RequirePermissions('CREATE', 'AVAILABILITY')
  @ApiOperation({ summary: 'Reemplazar toda la disponibilidad de un doctor' })
  @ApiResponse({
    status: 201,
    description: 'Disponibilidad guardada',
    type: [AvailabilityResponseDto],
  })
  async bulkSave(
    @Body() dto: BulkSaveAvailabilityDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<AvailabilityResponseDto[]> {
    return this.bulkSaveAvailabilityUseCase.execute(dto, clinicId);
  }

  @Post()
  @Auth()
  @RequirePermissions('CREATE', 'AVAILABILITY')
  @ApiOperation({ summary: 'Crear regla de disponibilidad para un doctor' })
  @ApiResponse({
    status: 201,
    description: 'Disponibilidad creada',
    type: AvailabilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Doctor o especialidad inválida' })
  @ApiResponse({ status: 409, description: 'Solapamiento de horarios' })
  async create(
    @Body() dto: CreateAvailabilityDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<AvailabilityResponseDto> {
    return this.createAvailabilityUseCase.execute(dto, clinicId);
  }

  @Get()
  @Auth()
  @RequirePermissions('READ', 'AVAILABILITY')
  @ApiOperation({ summary: 'Listar disponibilidades con paginación' })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    type: Number,
    description: 'Filtrar por ID de doctor',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de disponibilidades',
    type: PaginatedAvailabilityResponseDto,
  })
  async findAll(
    @Query() queryDto: FindAllAvailabilityQueryDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<PaginatedAvailabilityResponseDto> {
    const pagination = new PaginationImproved(
      queryDto.searchValue,
      queryDto.currentPage,
      queryDto.pageSize,
      queryDto.orderBy,
      queryDto.orderByMode,
    );
    return this.findAllAvailabilityUseCase.execute(
      pagination,
      queryDto.doctorId,
      clinicId,
    );
  }

  @Patch(':id')
  @Auth()
  @RequirePermissions('UPDATE', 'AVAILABILITY')
  @ApiOperation({ summary: 'Actualizar disponibilidad' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad actualizada',
    type: AvailabilityResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  @ApiResponse({ status: 409, description: 'Solapamiento de horarios' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<AvailabilityResponseDto> {
    return this.updateAvailabilityUseCase.execute(id, dto, clinicId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth()
  @RequirePermissions('DELETE', 'AVAILABILITY')
  @ApiOperation({ summary: 'Desactivar disponibilidad (soft delete)' })
  @ApiResponse({ status: 204, description: 'Disponibilidad desactivada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentClinic() clinicId: number | null,
  ): Promise<void> {
    return this.deleteAvailabilityUseCase.execute(id, clinicId);
  }
}
