import { Module } from '@nestjs/common';
import { CategoriesModule } from '../../categories/application/categories.module.js';
import { PrismaSpecialtyRepository } from '../infrastructure/persistence/prisma-specialty.repository.js';
import { CreateSpecialtyUseCase } from './use-cases/create-specialty.use-case.js';
import { FindAllSpecialtiesUseCase } from './use-cases/find-all-specialties.use-case.js';
import { UpdateSpecialtyUseCase } from './use-cases/update-specialty.use-case.js';
import { DeleteSpecialtyUseCase } from './use-cases/delete-specialty.use-case.js';
import { SpecialtyController } from '../interfaces/controllers/specialty.controller.js';

@Module({
  imports: [CategoriesModule],
  controllers: [SpecialtyController],
  providers: [
    {
      provide: 'ISpecialtyRepository',
      useClass: PrismaSpecialtyRepository,
    },
    CreateSpecialtyUseCase,
    FindAllSpecialtiesUseCase,
    UpdateSpecialtyUseCase,
    DeleteSpecialtyUseCase,
  ],
  exports: ['ISpecialtyRepository'],
})
export class SpecialtiesModule {}
