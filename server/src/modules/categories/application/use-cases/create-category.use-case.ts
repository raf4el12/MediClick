import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto.js';
import { CategoryResponseDto } from '../dto/category-response.dto.js';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.js';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const exists = await this.categoryRepository.existsByName(dto.name);
    if (exists) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    const category = await this.categoryRepository.create(dto);

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      order: category.order,
      isActive: category.isActive,
      createdAt: category.createdAt,
    };
  }
}
