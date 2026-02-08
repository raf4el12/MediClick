import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { CreatePrescriptionDto } from '../../application/dto/create-prescription.dto.js';
import { PrescriptionResponseDto } from '../../application/dto/prescription-response.dto.js';
import { CreatePrescriptionUseCase } from '../../application/use-cases/create-prescription.use-case.js';
import { FindPrescriptionByAppointmentUseCase } from '../../application/use-cases/find-prescription-by-appointment.use-case.js';

@ApiTags('Prescriptions')
@Controller('prescriptions')
export class PrescriptionController {
  constructor(
    private readonly createPrescriptionUseCase: CreatePrescriptionUseCase,
    private readonly findByAppointmentUseCase: FindPrescriptionByAppointmentUseCase,
  ) {}

  @Post()
  @Auth(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Crear receta médica (auto-completa la cita)' })
  @ApiResponse({
    status: 201,
    description: 'Receta creada y cita completada',
    type: PrescriptionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No es el doctor de esta cita' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe receta para esta cita' })
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePrescriptionDto,
  ): Promise<PrescriptionResponseDto> {
    return this.createPrescriptionUseCase.execute(userId, dto);
  }

  @Get('appointment/:appointmentId')
  @Auth(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Obtener receta de una cita' })
  @ApiResponse({ status: 200, type: PrescriptionResponseDto })
  @ApiResponse({ status: 403, description: 'No es el doctor de esta cita' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  async findByAppointment(
    @CurrentUser('id') userId: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ): Promise<PrescriptionResponseDto> {
    return this.findByAppointmentUseCase.execute(userId, appointmentId);
  }
}
