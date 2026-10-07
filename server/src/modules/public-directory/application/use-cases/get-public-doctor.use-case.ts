import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PublicDoctorDto } from '../dto/public-doctor.dto.js';
import { toPublicDoctor } from '../public-directory.mapper.js';
import type { IPublicDirectoryRepository } from '../../domain/repositories/public-directory.repository.js';

@Injectable()
export class GetPublicDoctorUseCase {
  constructor(
    @Inject('IPublicDirectoryRepository')
    private readonly repository: IPublicDirectoryRepository,
  ) {}

  async execute(id: number): Promise<PublicDoctorDto> {
    const doctor = await this.repository.findDoctor(id);
    if (!doctor) {
      throw new NotFoundException('Médico no encontrado');
    }
    return toPublicDoctor(doctor);
  }
}
