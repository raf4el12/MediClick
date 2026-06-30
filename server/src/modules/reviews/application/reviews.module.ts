import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../../appointments/application/appointments.module.js';
import { PatientsModule } from '../../patients/application/patients.module.js';
import { PrismaReviewRepository } from '../infrastructure/persistence/prisma-review.repository.js';
import { CreateReviewUseCase } from './use-cases/create-review.use-case.js';
import { GetDoctorReviewsUseCase } from './use-cases/get-doctor-reviews.use-case.js';
import { GetMyReviewsUseCase } from './use-cases/get-my-reviews.use-case.js';
import { SetReviewVisibilityUseCase } from './use-cases/set-review-visibility.use-case.js';
import { ReviewController } from '../interfaces/controllers/review.controller.js';

@Module({
  imports: [AppointmentsModule, PatientsModule],
  controllers: [ReviewController],
  providers: [
    {
      provide: 'IReviewRepository',
      useClass: PrismaReviewRepository,
    },
    CreateReviewUseCase,
    GetDoctorReviewsUseCase,
    GetMyReviewsUseCase,
    SetReviewVisibilityUseCase,
  ],
})
export class ReviewsModule {}
