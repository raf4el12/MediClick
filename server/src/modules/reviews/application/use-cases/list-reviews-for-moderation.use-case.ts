import { Injectable, Inject } from '@nestjs/common';
import { ListReviewsQueryDto } from '../dto/list-reviews-query.dto.js';
import { PaginatedReviewResponseDto } from '../dto/review-response.dto.js';
import { toReviewResponse } from '../mappers/review.mapper.js';
import { moderationScope } from '../moderation-scope.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class ListReviewsForModerationUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
  ) {}

  async execute(
    query: ListReviewsQueryDto,
    actor: Pick<AuthenticatedUser, 'roleName' | 'clinicId'>,
  ): Promise<PaginatedReviewResponseDto> {
    const clinicId = moderationScope(actor);
    const currentPage = query.currentPage ?? 1;
    const limit = query.pageSize ?? 10;

    const result = await this.reviewRepository.findForModeration(
      {
        clinicId,
        ...(query.isVisible !== undefined && { isVisible: query.isVisible }),
        ...(query.rating !== undefined && { rating: query.rating }),
        ...(query.doctorId !== undefined && { doctorId: query.doctorId }),
      },
      { offset: (currentPage - 1) * limit, limit },
    );

    return { ...result, rows: result.rows.map(toReviewResponse) };
  }
}
