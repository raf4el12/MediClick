import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { MedicalHistoryResponseDto } from '../dto/medical-history-response.dto.js';
import type { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';

@Injectable()
export class UpdateMedicalHistoryStatusUseCase {
    constructor(
        @Inject('IMedicalHistoryRepository')
        private readonly repository: IMedicalHistoryRepository,
    ) { }

    async execute(id: number, status: string): Promise<MedicalHistoryResponseDto> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException('Entrada de historial médico no encontrada');
        }

        const result = await this.repository.updateStatus(id, status);

        return {
            id: result.id,
            patientId: result.patientId,
            condition: result.condition,
            description: result.description,
            diagnosedDate: result.diagnosedDate,
            status: result.status,
            notes: result.notes,
            patient: {
                id: result.patient.id,
                name: result.patient.profile.name,
                lastName: result.patient.profile.lastName,
            },
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
        };
    }
}
