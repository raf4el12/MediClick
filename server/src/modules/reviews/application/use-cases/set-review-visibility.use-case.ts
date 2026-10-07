import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ReviewResponseDto } from '../dto/review-response.dto.js';
import { toReviewResponse } from '../mappers/review.mapper.js';
import { moderationScope } from '../moderation-scope.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class SetReviewVisibilityUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
  ) {}

  // Una reseña fuera de la sede del actor responde igual que una inexistente.
  async execute(
    reviewId: number,
    isVisible: boolean,
    actor: Pick<AuthenticatedUser, 'roleName' | 'clinicId'>,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.setVisibility(
      reviewId,
      isVisible,
      moderationScope(actor),
    );
    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }
    return toReviewResponse(review);
  }
}
