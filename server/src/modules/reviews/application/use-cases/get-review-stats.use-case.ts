import { Injectable, Inject } from '@nestjs/common';
import { ReviewStatsQueryDto } from '../dto/review-stats-query.dto.js';
import { ReviewStatsResponseDto } from '../dto/review-stats-response.dto.js';
import { moderationScope } from '../moderation-scope.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

/** Agregados de reseñas para la pantalla de moderación, con el alcance de sede del actor. */
@Injectable()
export class GetReviewStatsUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
  ) {}

  async execute(
    query: ReviewStatsQueryDto,
    actor: Pick<AuthenticatedUser, 'roleName' | 'clinicId'>,
  ): Promise<ReviewStatsResponseDto> {
    const clinicId = moderationScope(actor);
    const stats = await this.reviewRepository.stats({
      clinicId,
      ...(query.doctorId !== undefined && { doctorId: query.doctorId }),
    });

    return {
      total: stats.total,
      visible: stats.visible,
      hidden: stats.total - stats.visible,
      averageRating:
        stats.averageRating === null
          ? null
          : Math.round(stats.averageRating * 10) / 10,
      distribution: { ...stats.distribution },
    };
  }
}
