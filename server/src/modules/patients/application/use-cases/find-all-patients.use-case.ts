import { Injectable, Inject } from '@nestjs/common';
import { PatientResponseDto } from '../dto/patient-response.dto.js';
import { PaginatedPatientResponseDto } from '../dto/paginated-patient-response.dto.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

@Injectable()
export class FindAllPatientsUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    pagination: PaginationImproved,
    isActive?: boolean,
  ): Promise<PaginatedPatientResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    const result = await this.patientRepository.findAllPaginated({
      offset,
      limit,
      searchValue: pagination.searchValue,
      orderBy: pagination.orderBy,
      orderByMode: pagination.orderByMode,
      isActive,
    });

    const rows: PatientResponseDto[] = result.rows.map((p) => ({
      id: p.id,
      emergencyContact: p.emergencyContact,
      bloodType: p.bloodType,
      allergies: p.allergies,
      chronicConditions: p.chronicConditions,
      isActive: p.isActive,
      profile: {
        id: p.profile.id,
        name: p.profile.name,
        lastName: p.profile.lastName,
        email: p.profile.email,
        phone: p.profile.phone,
        birthday: p.profile.birthday,
        gender: p.profile.gender,
        typeDocument: p.profile.typeDocument,
        numberDocument: p.profile.numberDocument,
      },
      createdAt: p.createdAt,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      activeCount: result.activeCount,
      inactiveCount: result.inactiveCount,
    };
  }
}
