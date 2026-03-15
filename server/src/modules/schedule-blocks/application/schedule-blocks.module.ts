import { Module } from '@nestjs/common';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { PrismaScheduleBlockRepository } from '../infrastructure/persistence/prisma-schedule-block.repository.js';
import { CreateScheduleBlockUseCase } from './use-cases/create-schedule-block.use-case.js';
import { FindAllScheduleBlocksUseCase } from './use-cases/find-all-schedule-blocks.use-case.js';
import { UpdateScheduleBlockUseCase } from './use-cases/update-schedule-block.use-case.js';
import { DeleteScheduleBlockUseCase } from './use-cases/delete-schedule-block.use-case.js';
import { ScheduleBlockController } from '../interfaces/controllers/schedule-block.controller.js';

@Module({
  imports: [DoctorsModule],
  controllers: [ScheduleBlockController],
  providers: [
    {
      provide: 'IScheduleBlockRepository',
      useClass: PrismaScheduleBlockRepository,
    },
    CreateScheduleBlockUseCase,
    FindAllScheduleBlocksUseCase,
    UpdateScheduleBlockUseCase,
    DeleteScheduleBlockUseCase,
  ],
  exports: ['IScheduleBlockRepository'],
})
export class ScheduleBlocksModule {}
