import { Injectable, Inject } from '@nestjs/common';
import { CreateMedicalHistoryDto } from '../dto/create-medical-history.dto.js';
import { MedicalHistoryResponseDto } from '../dto/medical-history-response.dto.js';
import type { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';

@Injectable()
export class CreateMedicalHistoryUseCase {
  constructor(
    @Inject('IMedicalHistoryRepository')
    private readonly repository: IMedicalHistoryRepository,
  ) {}

  async execute(
    dto: CreateMedicalHistoryDto,
  ): Promise<MedicalHistoryResponseDto> {
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
