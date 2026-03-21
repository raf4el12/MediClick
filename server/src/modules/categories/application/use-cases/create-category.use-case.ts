import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto.js';
import { CategoryResponseDto } from '../dto/category-response.dto.js';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.js';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(
    dto: CreateCategoryDto,
    jwtClinicId?: number | null,
  ): Promise<CategoryResponseDto> {
    // JWT clinicId prevails over client-supplied
    const clinicId = jwtClinicId ?? dto.clinicId ?? null;
    if (jwtClinicId && dto.clinicId && dto.clinicId !== jwtClinicId) {
      throw new ForbiddenException('No puede crear categorías para otra sede');
    }

    const exists = await this.categoryRepository.existsByName(
      dto.name,
      clinicId,
    );
    if (exists) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    const category = await this.categoryRepository.create({
      ...dto,
      clinicId,
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      order: category.order,
      clinicId: category.clinicId,
      isActive: category.isActive,
      createdAt: category.createdAt,
    };
  }
}
