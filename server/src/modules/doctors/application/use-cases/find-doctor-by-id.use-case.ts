import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DoctorResponseDto } from '../dto/doctor-response.dto.js';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';

@Injectable()
export class FindDoctorByIdUseCase {
  constructor(
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    id: number,
    clinicId?: number | null,
  ): Promise<DoctorResponseDto> {
    const d = await this.doctorRepository.findById(id);
    if (!d) {
      throw new NotFoundException('Doctor no encontrado');
    }

    if (clinicId && d.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este doctor');
    }

    return {
      id: d.id,
      licenseNumber: d.licenseNumber,
      resume: d.resume,
      maxOverbookPerDay: d.maxOverbookPerDay,
      clinicId: d.clinicId,
      clinic: d.clinic,
      isActive: d.isActive,
      createdAt: d.createdAt,
      profile: {
        id: d.profile.id,
        name: d.profile.name,
        lastName: d.profile.lastName,
        email: d.profile.email,
        phone: d.profile.phone,
        gender: d.profile.gender,
      },
      user: d.profile.user,
      specialties: d.specialties.map((ds) => ds.specialty),
    };
  }
}
