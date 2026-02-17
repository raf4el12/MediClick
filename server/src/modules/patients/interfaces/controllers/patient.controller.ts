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
import { FindAllPatientsQueryDto } from '../../application/dto/find-all-patients-query.dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreatePatientDto } from '../../application/dto/create-patient.dto.js';
import { UpdatePatientDto } from '../../application/dto/update-patient.dto.js';
import { PatientResponseDto } from '../../application/dto/patient-response.dto.js';
import { PaginatedPatientResponseDto } from '../../application/dto/paginated-patient-response.dto.js';
import { PatientHistoryResponseDto } from '../../application/dto/patient-history-response.dto.js';
import { CreatePatientUseCase } from '../../application/use-cases/create-patient.use-case.js';
import { FindAllPatientsUseCase } from '../../application/use-cases/find-all-patients.use-case.js';
import { GetPatientHistoryUseCase } from '../../application/use-cases/get-patient-history.use-case.js';
import { UpdatePatientUseCase } from '../../application/use-cases/update-patient.use-case.js';
import { DeletePatientUseCase } from '../../application/use-cases/delete-patient.use-case.js';

@ApiTags('Patients')
@Controller('patients')
export class PatientController {
  constructor(
    private readonly createPatientUseCase: CreatePatientUseCase,
    private readonly findAllPatientsUseCase: FindAllPatientsUseCase,
    private readonly getPatientHistoryUseCase: GetPatientHistoryUseCase,
    private readonly updatePatientUseCase: UpdatePatientUseCase,
    private readonly deletePatientUseCase: DeletePatientUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Crear paciente con perfil y usuario' })
  @ApiResponse({
    status: 201,
    description: 'Paciente creado',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email o DNI duplicado' })
  async create(@Body() dto: CreatePatientDto): Promise<PatientResponseDto> {
    return this.createPatientUseCase.execute(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Listar pacientes con paginación' })
  @ApiResponse({ status: 200, type: PaginatedPatientResponseDto })
  async findAll(
    @Query() query: FindAllPatientsQueryDto,
  ): Promise<PaginatedPatientResponseDto> {
    const pagination = new PaginationImproved(
      query.searchValue,
      query.currentPage,
      query.pageSize,
      query.orderBy,
      query.orderByMode,
    );
    const isActiveFilter =
      query.isActive === 'true'
        ? true
        : query.isActive === 'false'
          ? false
          : undefined;
    return this.findAllPatientsUseCase.execute(pagination, isActiveFilter);
  }

  @Get(':id/history')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Obtener paciente con historial de citas' })
  @ApiResponse({ status: 200, type: PatientHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  async getHistory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PatientHistoryResponseDto> {
    return this.getPatientHistoryUseCase.execute(id);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Actualizar datos del paciente' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    return this.updatePatientUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar paciente (soft delete)' })
  @ApiResponse({ status: 204, description: 'Paciente eliminado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deletePatientUseCase.execute(id);
  }
}
