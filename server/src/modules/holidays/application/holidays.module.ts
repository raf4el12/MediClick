import { Module } from '@nestjs/common';
import { PrismaHolidayRepository } from '../infrastructure/persistence/prisma-holiday.repository.js';
import { CreateHolidayUseCase } from './use-cases/create-holiday.use-case.js';
import { FindAllHolidaysUseCase } from './use-cases/find-all-holidays.use-case.js';
import { UpdateHolidayUseCase } from './use-cases/update-holiday.use-case.js';
import { DeleteHolidayUseCase } from './use-cases/delete-holiday.use-case.js';
import { SeedPeruHolidaysUseCase } from './use-cases/seed-peru-holidays.use-case.js';
import { HolidayController } from '../interfaces/controllers/holiday.controller.js';

@Module({
  controllers: [HolidayController],
  providers: [
    {
      provide: 'IHolidayRepository',
      useClass: PrismaHolidayRepository,
    },
    CreateHolidayUseCase,
    FindAllHolidaysUseCase,
    UpdateHolidayUseCase,
    DeleteHolidayUseCase,
    SeedPeruHolidaysUseCase,
  ],
  exports: ['IHolidayRepository'],
})
export class HolidaysModule {}
