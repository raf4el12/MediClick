import { Module } from '@nestjs/common';
import { PrismaAgendaReadRepository } from '../infrastructure/persistence/prisma-agenda-read.repository.js';
import { PrismaRestrictionImpactRepository } from '../infrastructure/persistence/prisma-restriction-impact.repository.js';
import { GetAgendaUseCase } from './use-cases/get-agenda.use-case.js';
import { PreviewRestrictionImpactUseCase } from './use-cases/preview-restriction-impact.use-case.js';
import { AgendaController } from '../interfaces/controllers/agenda.controller.js';
import { AvailabilityRestrictionsController } from '../interfaces/controllers/availability-restrictions.controller.js';

@Module({
  controllers: [AgendaController, AvailabilityRestrictionsController],
  providers: [
    {
      provide: 'IAgendaReadRepository',
      useClass: PrismaAgendaReadRepository,
    },
    {
      provide: 'IRestrictionImpactRepository',
      useClass: PrismaRestrictionImpactRepository,
    },
    GetAgendaUseCase,
    PreviewRestrictionImpactUseCase,
  ],
})
export class AgendaModule {}
