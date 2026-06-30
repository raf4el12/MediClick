import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ReviewResponseDto } from '../dto/review-response.dto.js';
import { toReviewResponse } from '../mappers/review.mapper.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';

@Injectable()
export class SetReviewVisibilityUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
  ) {}

  async execute(
    reviewId: number,
    isVisible: boolean,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.setVisibility(
      reviewId,
      isVisible,
    );
    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }
    return toReviewResponse(review);
  }
}
