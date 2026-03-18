import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateDoctorDto } from '../dto/update-doctor.dto.js';
import { DoctorResponseDto } from '../dto/doctor-response.dto.js';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';

@Injectable()
export class UpdateDoctorUseCase {
    constructor(
        @Inject('IDoctorRepository')
        private readonly doctorRepository: IDoctorRepository,
    ) { }

    async execute(
        id: number,
        dto: UpdateDoctorDto,
    ): Promise<DoctorResponseDto> {
        const existing = await this.doctorRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Doctor no encontrado');
        }

        const updateData: {
            profile?: Record<string, unknown>;
            doctor?: Record<string, unknown>;
            specialtyIds?: number[];
        } = {};

        if (dto.name || dto.lastName || dto.phone || dto.gender) {
            updateData.profile = {
                ...(dto.name && { name: dto.name }),
                ...(dto.lastName && { lastName: dto.lastName }),
                ...(dto.phone && { phone: dto.phone }),
                ...(dto.gender && { gender: dto.gender }),
            };
        }

        if (dto.licenseNumber || dto.resume !== undefined || dto.maxOverbookPerDay !== undefined || dto.clinicId !== undefined) {
            updateData.doctor = {
                ...(dto.licenseNumber && { licenseNumber: dto.licenseNumber }),
                ...(dto.resume !== undefined && { resume: dto.resume }),
                ...(dto.maxOverbookPerDay !== undefined && { maxOverbookPerDay: dto.maxOverbookPerDay }),
                ...(dto.clinicId !== undefined && { clinicId: dto.clinicId }),
            };
        }

        if (dto.specialtyIds) {
            updateData.specialtyIds = dto.specialtyIds;
        }

        const updated = await this.doctorRepository.update(id, updateData);

        return {
            id: updated.id,
            licenseNumber: updated.licenseNumber,
            resume: updated.resume,
            maxOverbookPerDay: updated.maxOverbookPerDay,
            clinicId: updated.clinicId,
            clinic: updated.clinic,
            isActive: updated.isActive,
            createdAt: updated.createdAt,
            profile: {
                id: updated.profile.id,
                name: updated.profile.name,
                lastName: updated.profile.lastName,
                email: updated.profile.email,
                phone: updated.profile.phone,
                gender: updated.profile.gender,
            },
            user: updated.profile.user,
            specialties: updated.specialties.map((s) => s.specialty),
        };
    }
}
