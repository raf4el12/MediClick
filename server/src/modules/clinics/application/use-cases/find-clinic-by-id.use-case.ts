import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ClinicResponseDto } from '../dto/clinic-response.dto.js';
import type { IClinicRepository } from '../../domain/repositories/clinic.repository.js';

@Injectable()
export class FindClinicByIdUseCase {
  constructor(
    @Inject('IClinicRepository')
    private readonly clinicRepository: IClinicRepository,
  ) {}

  async execute(id: number): Promise<ClinicResponseDto> {
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) {
      throw new NotFoundException('Sede no encontrada');
    }

    return {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      timezone: clinic.timezone,
      currency: clinic.currency,
      isActive: clinic.isActive,
      createdAt: clinic.createdAt,
    };
  }
}
