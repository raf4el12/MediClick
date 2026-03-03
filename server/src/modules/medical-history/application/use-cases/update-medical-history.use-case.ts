import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateMedicalHistoryDto } from '../dto/update-medical-history.dto.js';
import { MedicalHistoryResponseDto } from '../dto/medical-history-response.dto.js';
import type { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';

@Injectable()
export class UpdateMedicalHistoryUseCase {
    constructor(
        @Inject('IMedicalHistoryRepository')
        private readonly repository: IMedicalHistoryRepository,
    ) { }

    async execute(
        id: number,
        dto: UpdateMedicalHistoryDto,
    ): Promise<MedicalHistoryResponseDto> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException('Entrada de historial médico no encontrada');
        }

        const result = await this.repository.update(id, {
            condition: dto.condition,
            description: dto.description,
            diagnosedDate: dto.diagnosedDate ? new Date(dto.diagnosedDate) : undefined,
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
