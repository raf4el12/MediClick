import { Injectable, Inject } from '@nestjs/common';
import { DoctorResponseDto } from '../dto/doctor-response.dto.js';
import { PaginatedDoctorResponseDto } from '../dto/paginated-doctor-response.dto.js';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

@Injectable()
export class FindAllDoctorsUseCase {
  constructor(
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    specialtyId?: number,
    clinicId?: number | null,
  ): Promise<PaginatedDoctorResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.doctorRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      specialtyId,
      clinicId,
    );

    const rows: DoctorResponseDto[] = result.rows.map((d) => ({
      id: d.id,
      licenseNumber: d.licenseNumber,
      resume: d.resume,
      maxOverbookPerDay: d.maxOverbookPerDay,
      clinicId: d.clinicId,
      clinic: d.clinic,
      isActive: d.isActive,
      createdAt: d.createdAt,
      profile: {
        id: d.profile.id,
        name: d.profile.name,
        lastName: d.profile.lastName,
        email: d.profile.email,
        phone: d.profile.phone,
        gender: d.profile.gender,
      },
      user: d.profile.user,
      specialties: d.specialties.map((ds) => ds.specialty),
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
