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
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreateAvailabilityDto } from '../../application/dto/create-availability.dto.js';
import { UpdateAvailabilityDto } from '../../application/dto/update-availability.dto.js';
import { AvailabilityResponseDto } from '../../application/dto/availability-response.dto.js';
import { PaginatedAvailabilityResponseDto } from '../../application/dto/paginated-availability-response.dto.js';
import { CreateAvailabilityUseCase } from '../../application/use-cases/create-availability.use-case.js';
import { FindAllAvailabilityUseCase } from '../../application/use-cases/find-all-availability.use-case.js';
import { UpdateAvailabilityUseCase } from '../../application/use-cases/update-availability.use-case.js';
import { DeleteAvailabilityUseCase } from '../../application/use-cases/delete-availability.use-case.js';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly createAvailabilityUseCase: CreateAvailabilityUseCase,
    private readonly findAllAvailabilityUseCase: FindAllAvailabilityUseCase,
    private readonly updateAvailabilityUseCase: UpdateAvailabilityUseCase,
    private readonly deleteAvailabilityUseCase: DeleteAvailabilityUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
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
  ): Promise<AvailabilityResponseDto> {
    return this.createAvailabilityUseCase.execute(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
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
    @Query() paginationDto: PaginationDto,
    @Query('doctorId') doctorId?: string,
  ): Promise<PaginatedAvailabilityResponseDto> {
    const pagination = new PaginationImproved(
      paginationDto.searchValue,
      paginationDto.currentPage,
      paginationDto.pageSize,
      paginationDto.orderBy,
      paginationDto.orderByMode,
    );
    const docId = doctorId ? parseInt(doctorId, 10) : undefined;
    return this.findAllAvailabilityUseCase.execute(pagination, docId);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
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
  ): Promise<AvailabilityResponseDto> {
    return this.updateAvailabilityUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Desactivar disponibilidad (soft delete)' })
  @ApiResponse({ status: 204, description: 'Disponibilidad desactivada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteAvailabilityUseCase.execute(id);
  }
}
