import { Module } from '@nestjs/common';
import { PrismaAgendaReadRepository } from '../infrastructure/persistence/prisma-agenda-read.repository.js';
import { GetAgendaUseCase } from './use-cases/get-agenda.use-case.js';
import { AgendaController } from '../interfaces/controllers/agenda.controller.js';

@Module({
  controllers: [AgendaController],
  providers: [
    {
      provide: 'IAgendaReadRepository',
      useClass: PrismaAgendaReadRepository,
    },
    GetAgendaUseCase,
  ],
})
export class AgendaModule {}
