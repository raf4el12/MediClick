import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.js';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(id: number, clinicId?: number | null): Promise<void> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Staff can only delete their clinic's categories (not global ones)
    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a esta categoría');
    }

    await this.categoryRepository.softDelete(id);
  }
}
