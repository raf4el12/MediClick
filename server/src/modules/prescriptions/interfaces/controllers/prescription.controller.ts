import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { CreatePrescriptionDto } from '../../application/dto/create-prescription.dto.js';
import { PrescriptionResponseDto } from '../../application/dto/prescription-response.dto.js';
import { CreatePrescriptionUseCase } from '../../application/use-cases/create-prescription.use-case.js';
import { FindPrescriptionByAppointmentUseCase } from '../../application/use-cases/find-prescription-by-appointment.use-case.js';
import { FindMyPrescriptionUseCase } from '../../application/use-cases/find-my-prescription.use-case.js';
import { GeneratePrescriptionPdfUseCase } from '../../application/use-cases/generate-prescription-pdf.use-case.js';
import { GenerateMyPrescriptionPdfUseCase } from '../../application/use-cases/generate-my-prescription-pdf.use-case.js';

@ApiTags('Prescriptions')
@Controller('prescriptions')
export class PrescriptionController {
  constructor(
    private readonly createPrescriptionUseCase: CreatePrescriptionUseCase,
    private readonly findByAppointmentUseCase: FindPrescriptionByAppointmentUseCase,
    private readonly findMyPrescriptionUseCase: FindMyPrescriptionUseCase,
    private readonly generatePdfUseCase: GeneratePrescriptionPdfUseCase,
    private readonly generateMyPdfUseCase: GenerateMyPrescriptionPdfUseCase,
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

  @Get('appointment/:appointmentId/pdf')
  @Auth(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Descargar receta en PDF (doctor)' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF de la receta' })
  @ApiResponse({ status: 403, description: 'No es el doctor de esta cita' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  async downloadPdf(
    @CurrentUser('id') userId: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.generatePdfUseCase.execute(userId, appointmentId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receta-${appointmentId}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('my/appointment/:appointmentId/pdf')
  @Auth(UserRole.PATIENT)
  @ApiOperation({ summary: 'Descargar mi receta en PDF (paciente)' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF de la receta' })
  @ApiResponse({ status: 403, description: 'No es el paciente de esta cita' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  async downloadMyPdf(
    @CurrentUser('id') userId: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.generateMyPdfUseCase.execute(
      userId,
      appointmentId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receta-${appointmentId}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('my/appointment/:appointmentId')
  @Auth(UserRole.PATIENT)
  @ApiOperation({ summary: 'Obtener mi receta de una cita (paciente)' })
  @ApiResponse({ status: 200, type: PrescriptionResponseDto })
  @ApiResponse({ status: 403, description: 'No es el paciente de esta cita' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  async findMyPrescription(
    @CurrentUser('id') userId: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ): Promise<PrescriptionResponseDto> {
    return this.findMyPrescriptionUseCase.execute(userId, appointmentId);
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
