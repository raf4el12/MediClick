import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdatePatientDto } from '../dto/update-patient.dto.js';
import { PatientResponseDto } from '../dto/patient-response.dto.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import type { UpdatePatientData } from '../../domain/interfaces/patient-data.interface.js';
import {
  PATIENT_UPDATED_EVENT,
  type PatientChangedEvent,
} from '../../../../shared/events/patient-events.interface.js';

@Injectable()
export class UpdatePatientUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    private readonly eventEmitter: EventEmitter2,
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

    const event: PatientChangedEvent = { patientId: updated.id };
    this.eventEmitter.emit(PATIENT_UPDATED_EVENT, event);

    return {
      id: updated.id,
      emergencyContact: updated.emergencyContact,
      bloodType: updated.bloodType,
      allergies: updated.allergies,
      chronicConditions: updated.chronicConditions,
      isActive: updated.isActive,
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
