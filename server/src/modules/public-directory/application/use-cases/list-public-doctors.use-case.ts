import { Inject, Injectable } from '@nestjs/common';
import { PaginatedPublicDoctorsDto } from '../dto/public-doctor.dto.js';
import { ListPublicDoctorsQueryDto } from '../dto/list-public-doctors-query.dto.js';
import { toPageRequest } from '../dto/public-page-query.dto.js';
import { toPublicDoctorSummary } from '../public-directory.mapper.js';
import type { IPublicDirectoryRepository } from '../../domain/repositories/public-directory.repository.js';

@Injectable()
export class ListPublicDoctorsUseCase {
  constructor(
    @Inject('IPublicDirectoryRepository')
    private readonly repository: IPublicDirectoryRepository,
  ) {}

  async execute(
    query: ListPublicDoctorsQueryDto,
  ): Promise<PaginatedPublicDoctorsDto> {
    const page = toPageRequest(query);
    const { rows, totalRows } = await this.repository.listDoctors(
      {
        ...(query.clinicId !== undefined && { clinicId: query.clinicId }),
        ...(query.specialtyId !== undefined && {
          specialtyId: query.specialtyId,
        }),
        ...(query.searchValue && { searchValue: query.searchValue }),
      },
      page,
    );

    return {
      rows: rows.map(toPublicDoctorSummary),
      totalRows,
      currentPage: page.offset / page.limit + 1,
      totalPages: Math.ceil(totalRows / page.limit),
    };
  }
}
