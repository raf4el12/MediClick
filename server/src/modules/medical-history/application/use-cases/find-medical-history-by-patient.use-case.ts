import { Injectable, Inject } from '@nestjs/common';
import { MedicalHistoryQueryDto } from '../dto/medical-history-query.dto.js';
import {
  PaginatedMedicalHistoryResponseDto,
  MedicalHistoryResponseDto,
} from '../dto/medical-history-response.dto.js';
import type { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';

@Injectable()
export class FindMedicalHistoryByPatientUseCase {
  constructor(
    @Inject('IMedicalHistoryRepository')
    private readonly repository: IMedicalHistoryRepository,
  ) {}

  async execute(
    patientId: number,
    query: MedicalHistoryQueryDto,
  ): Promise<PaginatedMedicalHistoryResponseDto> {
    const result = await this.repository.findByPatientId(patientId, {
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map((r) => this.toResponse(r)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
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
