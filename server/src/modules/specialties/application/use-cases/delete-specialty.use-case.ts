import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ISpecialtyRepository } from '../../domain/repositories/specialty.repository.js';

@Injectable()
export class DeleteSpecialtyUseCase {
  constructor(
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
  ) {}

  async execute(id: number, clinicId?: number | null): Promise<void> {
    const existing = await this.specialtyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Especialidad no encontrada');
    }

    // Staff can only delete their clinic's specialties (not global ones)
    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a esta especialidad');
    }

    await this.specialtyRepository.softDelete(id);
  }
}
