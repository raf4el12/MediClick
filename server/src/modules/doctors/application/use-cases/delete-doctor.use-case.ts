import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';

@Injectable()
export class DeleteDoctorUseCase {
  constructor(
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(id: number, clinicId?: number | null): Promise<void> {
    const existing = await this.doctorRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Doctor no encontrado');
    }

    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este doctor');
    }

    await this.doctorRepository.softDelete(id);
  }
}
