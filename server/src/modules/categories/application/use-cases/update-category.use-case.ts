import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UpdateCategoryDto } from '../dto/update-category.dto.js';
import { CategoryResponseDto } from '../dto/category-response.dto.js';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.js';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (dto.name) {
      const nameConflict = await this.categoryRepository.existsByNameExcluding(
        dto.name,
        id,
      );
      if (nameConflict) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
    }

    const updated = await this.categoryRepository.update(id, dto);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      icon: updated.icon,
      color: updated.color,
      order: updated.order,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    };
  }
}
