import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Auth,
  CurrentUser,
  RequirePermissions,
} from '../../../../shared/decorators/index.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { RestrictionImpactQueryDto } from '../../application/dto/restriction-impact-query.dto.js';
import { RestrictionImpactResponseDto } from '../../application/dto/restriction-impact-response.dto.js';
import { PreviewRestrictionImpactUseCase } from '../../application/use-cases/preview-restriction-impact.use-case.js';

@ApiTags('Agenda')
@Controller('availability-restrictions')
export class AvailabilityRestrictionsController {
  constructor(
    private readonly previewRestrictionImpactUseCase: PreviewRestrictionImpactUseCase,
  ) {}

  @Get('impact')
  @Auth()
  @RequirePermissions('READ', 'AGENDA')
  @ApiOperation({
    summary:
      'Vista previa de las citas que cancelaría un bloqueo de agenda o un feriado antes de guardarlo (solo lectura)',
  })
  @ApiResponse({ status: 200, type: RestrictionImpactResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Combinación inválida de parámetros, fechas u horas mal formadas, fin antes del inicio o rango mayor a 62 días',
  })
  @ApiResponse({
    status: 403,
    description:
      'Sin READ:AGENDA, médico pidiendo un feriado, personal sin sede o feriado de otra sede',
  })
  @ApiResponse({
    status: 404,
    description: 'Médico o sede inexistente o fuera del alcance del actor',
  })
  previewImpact(
    @Query() query: RestrictionImpactQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<RestrictionImpactResponseDto> {
    return this.previewRestrictionImpactUseCase.execute(actor, query);
  }
}
