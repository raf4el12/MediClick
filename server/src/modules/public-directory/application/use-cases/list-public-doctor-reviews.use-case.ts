import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PublicDoctorReviewsDto } from '../dto/public-doctor.dto.js';
import {
  PublicPageQueryDto,
  toPageRequest,
} from '../dto/public-page-query.dto.js';
import { toPublicReview } from '../public-directory.mapper.js';
import type { IPublicDirectoryRepository } from '../../domain/repositories/public-directory.repository.js';

@Injectable()
export class ListPublicDoctorReviewsUseCase {
  constructor(
    @Inject('IPublicDirectoryRepository')
    private readonly repository: IPublicDirectoryRepository,
  ) {}

  // El promedio y el conteo vienen del médico: ya se recalculan solo con las
  // reseñas visibles cada vez que una se crea u oculta.
  async execute(
    doctorId: number,
    query: PublicPageQueryDto,
  ): Promise<PublicDoctorReviewsDto> {
    const doctor = await this.repository.findDoctor(doctorId);
    if (!doctor) {
      throw new NotFoundException('Médico no encontrado');
    }

    const { rows, totalRows } = await this.repository.listVisibleReviews(
      doctorId,
      toPageRequest(query),
    );
    return {
      rows: rows.map(toPublicReview),
      totalRows,
      ratingAvg: doctor.ratingAvg,
      ratingCount: doctor.ratingCount,
    };
  }
}
