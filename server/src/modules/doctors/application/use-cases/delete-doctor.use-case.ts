import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';

@Injectable()
export class DeleteDoctorUseCase {
    constructor(
        @Inject('IDoctorRepository')
        private readonly doctorRepository: IDoctorRepository,
    ) { }

    async execute(id: number): Promise<void> {
        const existing = await this.doctorRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Doctor no encontrado');
        }

        await this.doctorRepository.softDelete(id);
    }
}
