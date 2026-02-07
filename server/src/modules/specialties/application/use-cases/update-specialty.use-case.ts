import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateSpecialtyDto } from '../dto/update-specialty.dto.js';
import { SpecialtyResponseDto } from '../dto/specialty-response.dto.js';
import type { ISpecialtyRepository } from '../../domain/repositories/specialty.repository.js';
import type { ICategoryRepository } from '../../../categories/domain/repositories/category.repository.js';

@Injectable()
export class UpdateSpecialtyUseCase {
  constructor(
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    const existing = await this.specialtyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Especialidad no encontrada');
    }

    const categoryId = dto.categoryId ?? existing.categoryId;
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new BadRequestException('La categoría especificada no existe');
    }

    const savedEntity = await this.specialtyRepository.update(id, dto);

    return {
      id: savedEntity.id,
      name: savedEntity.name,
      description: savedEntity.description,
      duration: savedEntity.duration,
      price: savedEntity.price ? Number(savedEntity.price) : null,
      requirements: savedEntity.requirements,
      icon: savedEntity.icon,
      isActive: savedEntity.isActive,
      createdAt: savedEntity.createdAt,
      category: { id: category.id, name: category.name },
    };
  }
}
