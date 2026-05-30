import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ReviewResponseDto } from '../dto/review-response.dto.js';
import { toReviewResponse } from '../mappers/review.mapper.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';

@Injectable()
export class GetMyReviewsUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(userId: number): Promise<ReviewResponseDto[]> {
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new BadRequestException(
        'No se encontró un paciente asociado a este usuario',
      );
    }

    const reviews = await this.reviewRepository.findByPatientId(patient.id);
    return reviews.map(toReviewResponse);
  }
}
