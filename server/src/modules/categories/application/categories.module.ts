import { Module } from '@nestjs/common';
import { PrismaCategoryRepository } from '../infrastructure/persistence/prisma-category.repository.js';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case.js';
import { FindAllCategoriesUseCase } from './use-cases/find-all-categories.use-case.js';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case.js';
import { DeleteCategoryUseCase } from './use-cases/delete-category.use-case.js';
import { CategoryController } from '../interfaces/controllers/category.controller.js';

@Module({
  controllers: [CategoryController],
  providers: [
    {
      provide: 'ICategoryRepository',
      useClass: PrismaCategoryRepository,
    },
    CreateCategoryUseCase,
    FindAllCategoriesUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
  ],
  exports: ['ICategoryRepository'],
})
export class CategoriesModule {}
