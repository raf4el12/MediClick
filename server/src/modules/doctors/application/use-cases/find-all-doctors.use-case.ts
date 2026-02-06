import { Injectable, Inject } from '@nestjs/common';
import { DoctorResponseDto } from '../dto/doctor-response.dto.js';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';

@Injectable()
export class FindAllDoctorsUseCase {
  constructor(
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(): Promise<DoctorResponseDto[]> {
    const doctors = await this.doctorRepository.findAll();

    return doctors.map((d) => ({
      id: d.id,
      licenseNumber: d.licenseNumber,
      resume: d.resume,
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
    }));
  }
}
