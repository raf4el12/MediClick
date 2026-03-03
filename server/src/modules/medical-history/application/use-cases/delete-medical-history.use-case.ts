import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';

@Injectable()
export class DeleteMedicalHistoryUseCase {
    constructor(
        @Inject('IMedicalHistoryRepository')
        private readonly repository: IMedicalHistoryRepository,
    ) { }

    async execute(id: number): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException('Entrada de historial médico no encontrada');
        }

        await this.repository.softDelete(id);
    }
}
