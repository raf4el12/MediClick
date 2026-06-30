import { Injectable, Inject } from '@nestjs/common';
import { DoctorReviewsResponseDto } from '../dto/review-response.dto.js';
import { toReviewResponse } from '../mappers/review.mapper.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';

@Injectable()
export class GetDoctorReviewsUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
  ) {}

  // includeHidden = vista de moderación (admin); el promedio/conteo siempre
  // se calcula solo sobre las visibles, aunque se devuelvan también las ocultas.
  async execute(
    doctorId: number,
    includeHidden = false,
  ): Promise<DoctorReviewsResponseDto> {
    const reviews = await this.reviewRepository.findByDoctorId(
      doctorId,
      !includeHidden,
    );

    const visible = reviews.filter((r) => r.isVisible);
    const ratingCount = visible.length;
    const ratingAvg =
      ratingCount === 0
        ? null
        : visible.reduce((sum, r) => sum + r.rating, 0) / ratingCount;

    return {
      doctorId,
      ratingAvg,
      ratingCount,
      reviews: reviews.map(toReviewResponse),
    };
  }
}
