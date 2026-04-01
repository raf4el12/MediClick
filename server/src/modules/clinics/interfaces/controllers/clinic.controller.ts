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
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreateClinicDto } from '../../application/dto/create-clinic.dto.js';
import { UpdateClinicDto } from '../../application/dto/update-clinic.dto.js';
import { ClinicResponseDto } from '../../application/dto/clinic-response.dto.js';
import { PaginatedClinicResponseDto } from '../../application/dto/paginated-clinic-response.dto.js';
import { CreateClinicUseCase } from '../../application/use-cases/create-clinic.use-case.js';
import { FindAllClinicsUseCase } from '../../application/use-cases/find-all-clinics.use-case.js';
import { FindClinicByIdUseCase } from '../../application/use-cases/find-clinic-by-id.use-case.js';
import { UpdateClinicUseCase } from '../../application/use-cases/update-clinic.use-case.js';
import { DeleteClinicUseCase } from '../../application/use-cases/delete-clinic.use-case.js';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicController {
  constructor(
    private readonly createClinicUseCase: CreateClinicUseCase,
    private readonly findAllClinicsUseCase: FindAllClinicsUseCase,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly updateClinicUseCase: UpdateClinicUseCase,
    private readonly deleteClinicUseCase: DeleteClinicUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear sede' })
  @ApiResponse({
    status: 201,
    description: 'Sede creada',
    type: ClinicResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Nombre duplicado' })
  async create(@Body() dto: CreateClinicDto): Promise<ClinicResponseDto> {
    return this.createClinicUseCase.execute(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.PATIENT)
  @ApiOperation({ summary: 'Listar sedes con paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de sedes',
    type: PaginatedClinicResponseDto,
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedClinicResponseDto> {
    const pagination = new PaginationImproved(
      paginationDto.searchValue,
      paginationDto.currentPage,
      paginationDto.pageSize,
      paginationDto.orderBy,
      paginationDto.orderByMode,
    );
    return this.findAllClinicsUseCase.execute(pagination);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener sede por ID' })
  @ApiResponse({
    status: 200,
    description: 'Sede encontrada',
    type: ClinicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ClinicResponseDto> {
    return this.findClinicByIdUseCase.execute(id);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar sede' })
  @ApiResponse({
    status: 200,
    description: 'Sede actualizada',
    type: ClinicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClinicDto,
  ): Promise<ClinicResponseDto> {
    return this.updateClinicUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar sede (soft delete)' })
  @ApiResponse({ status: 204, description: 'Sede eliminada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteClinicUseCase.execute(id);
  }
}
