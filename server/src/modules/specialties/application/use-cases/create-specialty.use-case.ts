import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CreateSpecialtyDto } from '../dto/create-specialty.dto.js';
import { SpecialtyResponseDto } from '../dto/specialty-response.dto.js';
import type { ISpecialtyRepository } from '../../domain/repositories/specialty.repository.js';
import type { ICategoryRepository } from '../../../categories/domain/repositories/category.repository.js';

@Injectable()
export class CreateSpecialtyUseCase {
  constructor(
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto> {
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new BadRequestException('La categoría especificada no existe');
    }

    const specialty = await this.specialtyRepository.create(dto);

    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      duration: specialty.duration,
      price: specialty.price ? Number(specialty.price) : null,
      requirements: specialty.requirements,
      icon: specialty.icon,
      isActive: specialty.isActive,
      createdAt: specialty.createdAt,
      category: specialty.category,
    };
  }
}
