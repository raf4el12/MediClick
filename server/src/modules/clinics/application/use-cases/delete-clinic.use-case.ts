import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IClinicRepository } from '../../domain/repositories/clinic.repository.js';

@Injectable()
export class DeleteClinicUseCase {
  constructor(
    @Inject('IClinicRepository')
    private readonly clinicRepository: IClinicRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) {
      throw new NotFoundException('Sede no encontrada');
    }

    await this.clinicRepository.softDelete(id);
  }
}
