import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Auth,
  CurrentUser,
  RequirePermissions,
} from '../../../../shared/decorators/index.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AgendaQueryDto } from '../../application/dto/agenda-query.dto.js';
import { AgendaResponseDto } from '../../application/dto/agenda-response.dto.js';
import { GetAgendaUseCase } from '../../application/use-cases/get-agenda.use-case.js';

@ApiTags('Agenda')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly getAgendaUseCase: GetAgendaUseCase) {}

  @Get()
  @Auth()
  @RequirePermissions('READ', 'AGENDA')
  @ApiOperation({
    summary:
      'Agenda de un médico o de una sede por rango: cupos, citas, bloqueos, feriados e indicadores en hora local',
  })
  @ApiResponse({ status: 200, type: AgendaResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'doctorId y clinicId a la vez, ninguno siendo administrador global, fechas inválidas o rango mayor a 42 días (médico) o 7 días (sede)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Sin READ:AGENDA, médico pidiendo una sede, usuario médico sin perfil o personal sin sede',
  })
  @ApiResponse({
    status: 404,
    description: 'Médico o sede inexistente o fuera del alcance del actor',
  })
  getAgenda(
    @Query() query: AgendaQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AgendaResponseDto> {
    return this.getAgendaUseCase.execute(actor, query);
  }
}
