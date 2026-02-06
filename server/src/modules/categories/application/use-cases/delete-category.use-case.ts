import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.js';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    await this.categoryRepository.softDelete(id);
  }
}
