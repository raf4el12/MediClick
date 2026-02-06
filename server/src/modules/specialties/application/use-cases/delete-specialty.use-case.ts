import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ISpecialtyRepository } from '../../domain/repositories/specialty.repository.js';

@Injectable()
export class DeleteSpecialtyUseCase {
  constructor(
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.specialtyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Especialidad no encontrada');
    }

    await this.specialtyRepository.softDelete(id);
  }
}
