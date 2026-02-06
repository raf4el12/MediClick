import { Injectable, Inject } from '@nestjs/common';
import { CategoryResponseDto } from '../dto/category-response.dto.js';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.js';

@Injectable()
export class FindAllCategoriesUseCase {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.findAll();

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      order: c.order,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }
}
