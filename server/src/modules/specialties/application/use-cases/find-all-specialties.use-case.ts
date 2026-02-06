import { Injectable, Inject } from '@nestjs/common';
import { SpecialtyResponseDto } from '../dto/specialty-response.dto.js';
import type { ISpecialtyRepository } from '../../domain/repositories/specialty.repository.js';

@Injectable()
export class FindAllSpecialtiesUseCase {
  constructor(
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
  ) {}

  async execute(): Promise<SpecialtyResponseDto[]> {
    const specialties = await this.specialtyRepository.findAll();

    return specialties.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price ? Number(s.price) : null,
      requirements: s.requirements,
      icon: s.icon,
      isActive: s.isActive,
      createdAt: s.createdAt,
      category: s.category,
    }));
  }
}
