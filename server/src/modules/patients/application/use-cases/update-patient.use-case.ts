import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdatePatientDto } from '../dto/update-patient.dto.js';
import { PatientResponseDto } from '../dto/patient-response.dto.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import type { UpdatePatientData } from '../../domain/interfaces/patient-data.interface.js';

@Injectable()
export class UpdatePatientUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    const existing = await this.patientRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const updateData: UpdatePatientData = {};

    if (
      dto.name ||
      dto.lastName ||
      dto.phone ||
      dto.birthday ||
      dto.gender ||
      dto.address
    ) {
      updateData.profile = {
        ...(dto.name && { name: dto.name }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.birthday && { birthday: new Date(dto.birthday) }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.address && { address: dto.address }),
      };
    }

    if (
      dto.emergencyContact ||
      dto.bloodType ||
      dto.allergies !== undefined ||
      dto.chronicConditions !== undefined
    ) {
      updateData.patient = {
        ...(dto.emergencyContact && { emergencyContact: dto.emergencyContact }),
        ...(dto.bloodType && { bloodType: dto.bloodType }),
        ...(dto.allergies !== undefined && { allergies: dto.allergies }),
        ...(dto.chronicConditions !== undefined && {
          chronicConditions: dto.chronicConditions,
        }),
      };
    }

    const updated = await this.patientRepository.update(id, updateData);

    return {
      id: updated.id,
      emergencyContact: updated.emergencyContact,
      bloodType: updated.bloodType,
      allergies: updated.allergies,
      chronicConditions: updated.chronicConditions,
      profile: {
        id: updated.profile.id,
        name: updated.profile.name,
        lastName: updated.profile.lastName,
        email: updated.profile.email,
        phone: updated.profile.phone,
        birthday: updated.profile.birthday,
        gender: updated.profile.gender,
        typeDocument: updated.profile.typeDocument,
        numberDocument: updated.profile.numberDocument,
      },
      createdAt: updated.createdAt,
    };
  }
}
