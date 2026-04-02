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
import { Auth } from '../../../../shared/decorators/index.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { CreateMedicalHistoryDto } from '../../application/dto/create-medical-history.dto.js';
import { UpdateMedicalHistoryDto } from '../../application/dto/update-medical-history.dto.js';
import { UpdateStatusDto } from '../../application/dto/update-status.dto.js';
import { MedicalHistoryQueryDto } from '../../application/dto/medical-history-query.dto.js';
import {
  MedicalHistoryResponseDto,
  PaginatedMedicalHistoryResponseDto,
} from '../../application/dto/medical-history-response.dto.js';
import { CreateMedicalHistoryUseCase } from '../../application/use-cases/create-medical-history.use-case.js';
import { FindMedicalHistoryByPatientUseCase } from '../../application/use-cases/find-medical-history-by-patient.use-case.js';
import { UpdateMedicalHistoryUseCase } from '../../application/use-cases/update-medical-history.use-case.js';
import { UpdateMedicalHistoryStatusUseCase } from '../../application/use-cases/update-medical-history-status.use-case.js';
import { DeleteMedicalHistoryUseCase } from '../../application/use-cases/delete-medical-history.use-case.js';

@ApiTags('Medical History')
@Controller('medical-history')
export class MedicalHistoryController {
  constructor(
    private readonly createUseCase: CreateMedicalHistoryUseCase,
    private readonly findByPatientUseCase: FindMedicalHistoryByPatientUseCase,
    private readonly updateUseCase: UpdateMedicalHistoryUseCase,
    private readonly updateStatusUseCase: UpdateMedicalHistoryStatusUseCase,
    private readonly deleteUseCase: DeleteMedicalHistoryUseCase,
  ) {}

  @Post()
  @Auth()
  @RequirePermissions('CREATE', 'MEDICAL_HISTORY')
  @ApiOperation({ summary: 'Crear entrada de historial médico' })
  @ApiResponse({
    status: 201,
    description: 'Entrada creada',
    type: MedicalHistoryResponseDto,
  })
  async create(
    @Body() dto: CreateMedicalHistoryDto,
  ): Promise<MedicalHistoryResponseDto> {
    return this.createUseCase.execute(dto);
  }

  @Get('patient/:patientId')
  @Auth()
  @RequirePermissions('READ', 'MEDICAL_HISTORY')
  @ApiOperation({ summary: 'Listar historial médico de un paciente' })
  @ApiResponse({
    status: 200,
    type: PaginatedMedicalHistoryResponseDto,
  })
  async findByPatient(
    @CurrentUser('id') userId: number,
    @CurrentUser('roleName') role: string,
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: MedicalHistoryQueryDto,
  ): Promise<PaginatedMedicalHistoryResponseDto> {
    return this.findByPatientUseCase.execute(patientId, query, userId, role);
  }

  @Patch(':id')
  @Auth()
  @RequirePermissions('UPDATE', 'MEDICAL_HISTORY')
  @ApiOperation({ summary: 'Actualizar entrada de historial médico' })
  @ApiResponse({ status: 200, type: MedicalHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'Entrada no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalHistoryDto,
  ): Promise<MedicalHistoryResponseDto> {
    return this.updateUseCase.execute(id, dto);
  }

  @Patch(':id/status')
  @Auth()
  @RequirePermissions('UPDATE', 'MEDICAL_HISTORY')
  @ApiOperation({ summary: 'Cambiar estado de una condición' })
  @ApiResponse({ status: 200, type: MedicalHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'Entrada no encontrada' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ): Promise<MedicalHistoryResponseDto> {
    return this.updateStatusUseCase.execute(id, dto.status);
  }

  @Delete(':id')
  @Auth()
  @RequirePermissions('DELETE', 'MEDICAL_HISTORY')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar entrada de historial médico' })
  @ApiResponse({ status: 204, description: 'Entrada eliminada' })
  @ApiResponse({ status: 404, description: 'Entrada no encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteUseCase.execute(id);
  }
}
