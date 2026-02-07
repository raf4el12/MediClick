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
import { CreateClinicalNoteDto } from '../../application/dto/create-clinical-note.dto.js';
import { ClinicalNoteResponseDto } from '../../application/dto/clinical-note-response.dto.js';
import { CreateClinicalNoteUseCase } from '../../application/use-cases/create-clinical-note.use-case.js';
import { FindClinicalNotesByAppointmentUseCase } from '../../application/use-cases/find-clinical-notes-by-appointment.use-case.js';

@ApiTags('Clinical Notes')
@Controller('clinical-notes')
export class ClinicalNoteController {
  constructor(
    private readonly createClinicalNoteUseCase: CreateClinicalNoteUseCase,
    private readonly findByAppointmentUseCase: FindClinicalNotesByAppointmentUseCase,
  ) {}

  @Post()
  @Auth(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Crear nota clínica para una cita' })
  @ApiResponse({ status: 201, description: 'Nota creada', type: ClinicalNoteResponseDto })
  @ApiResponse({ status: 403, description: 'No es el doctor de esta cita' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateClinicalNoteDto,
  ): Promise<ClinicalNoteResponseDto> {
    return this.createClinicalNoteUseCase.execute(userId, dto);
  }

  @Get('appointment/:appointmentId')
  @Auth(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Obtener notas clínicas de una cita' })
  @ApiResponse({ status: 200, type: [ClinicalNoteResponseDto] })
  @ApiResponse({ status: 403, description: 'No es el doctor de esta cita' })
  async findByAppointment(
    @CurrentUser('id') userId: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ): Promise<ClinicalNoteResponseDto[]> {
    return this.findByAppointmentUseCase.execute(userId, appointmentId);
  }
}
