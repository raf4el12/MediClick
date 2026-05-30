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

  async execute(doctorId: number): Promise<DoctorReviewsResponseDto> {
    // Solo reseñas visibles: el promedio se deriva de las mismas que se muestran.
    const reviews = await this.reviewRepository.findByDoctorId(doctorId, true);

    const ratingCount = reviews.length;
    const ratingAvg =
      ratingCount === 0
        ? null
        : reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount;

    return {
      doctorId,
      ratingAvg,
      ratingCount,
      reviews: reviews.map(toReviewResponse),
    };
  }
}
