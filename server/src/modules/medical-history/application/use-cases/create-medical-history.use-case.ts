import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CreateMedicalHistoryDto } from '../dto/create-medical-history.dto.js';
import { MedicalHistoryResponseDto } from '../dto/medical-history-response.dto.js';
import type { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';

@Injectable()
export class CreateMedicalHistoryUseCase {
  constructor(
    @Inject('IMedicalHistoryRepository')
    private readonly repository: IMedicalHistoryRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    dto: CreateMedicalHistoryDto,
  ): Promise<MedicalHistoryResponseDto> {
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const result = await this.repository.create({
      patientId: dto.patientId,
      condition: dto.condition,
      description: dto.description,
      diagnosedDate: dto.diagnosedDate
        ? new Date(dto.diagnosedDate)
        : undefined,
      status: dto.status,
      notes: dto.notes,
    });

    return this.toResponse(result);
  }

  private toResponse(r: any): MedicalHistoryResponseDto {
    return {
      id: r.id,
      patientId: r.patientId,
      condition: r.condition,
      description: r.description,
      diagnosedDate: r.diagnosedDate,
      status: r.status,
      notes: r.notes,
      patient: {
        id: r.patient.id,
        name: r.patient.profile.name,
        lastName: r.patient.profile.lastName,
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
