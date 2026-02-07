import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';

@Injectable()
export class DeleteAvailabilityUseCase {
  constructor(
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.availabilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Disponibilidad no encontrada');
    }

    await this.availabilityRepository.softDelete(id);
  }
}
