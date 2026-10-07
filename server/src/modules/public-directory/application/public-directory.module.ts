import { Module } from '@nestjs/common';
import { PrismaPublicDirectoryRepository } from '../infrastructure/persistence/prisma-public-directory.repository.js';
import { PublicDoctorsController } from '../interfaces/controllers/public-doctors.controller.js';
import { ListPublicDoctorsUseCase } from './use-cases/list-public-doctors.use-case.js';
import { GetPublicDoctorUseCase } from './use-cases/get-public-doctor.use-case.js';
import { ListPublicDoctorReviewsUseCase } from './use-cases/list-public-doctor-reviews.use-case.js';

@Module({
  controllers: [PublicDoctorsController],
  providers: [
    {
      provide: 'IPublicDirectoryRepository',
      useClass: PrismaPublicDirectoryRepository,
    },
    ListPublicDoctorsUseCase,
    GetPublicDoctorUseCase,
    ListPublicDoctorReviewsUseCase,
  ],
})
export class PublicDirectoryModule {}
