import { Injectable, Inject } from '@nestjs/common';
import { DoctorReviewsResponseDto } from '../dto/review-response.dto.js';
import { toReviewResponse } from '../mappers/review.mapper.js';
import { moderationScope } from '../moderation-scope.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class GetDoctorReviewsUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
  ) {}

  // Sin `moderator`: reseñas visibles, iguales para cualquiera. Con
  // `moderator`: también las ocultas, solo de médicos de su sede. El promedio
  // y el conteo siempre se calculan sobre las visibles.
  async execute(
    doctorId: number,
    moderator?: Pick<AuthenticatedUser, 'roleName' | 'clinicId'>,
  ): Promise<DoctorReviewsResponseDto> {
    const reviews = await this.reviewRepository.findByDoctorId(
      doctorId,
      !moderator,
      moderator ? moderationScope(moderator) : null,
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
