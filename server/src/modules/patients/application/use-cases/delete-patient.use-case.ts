import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';

@Injectable()
export class DeletePatientUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.patientRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Paciente no encontrado');
    }

    await this.patientRepository.softDelete(id);
  }
}
