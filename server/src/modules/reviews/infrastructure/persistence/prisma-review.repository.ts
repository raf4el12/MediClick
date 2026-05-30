import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { tenantStorage } from '../../../../prisma/tenant-context.js';
import { IReviewRepository } from '../../domain/repositories/review.repository.js';
import {
  CreateReviewData,
  ReviewWithRelations,
} from '../../domain/interfaces/review-data.interface.js';

const reviewInclude = {
  patient: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true } },
    },
  },
} as const;

@Injectable()
export class PrismaReviewRepository implements IReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReviewData): Promise<ReviewWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.create({
        data: {
          appointmentId: data.appointmentId,
          doctorId: data.doctorId,
          patientId: data.patientId,
          rating: data.rating,
          comment: data.comment,
          clinicId: data.clinicId ?? tenantStorage.getStore() ?? null,
        },
        include: reviewInclude,
      });

      await this.recalculateDoctorRating(tx, data.doctorId);

      return review as unknown as ReviewWithRelations;
    });
  }

  async existsByAppointmentId(appointmentId: number): Promise<boolean> {
    const count = await this.prisma.reviews.count({
      where: { appointmentId },
    });
    return count > 0;
  }

  async findByDoctorId(
    doctorId: number,
    onlyVisible: boolean,
  ): Promise<ReviewWithRelations[]> {
    return this.prisma.tenant.reviews.findMany({
      where: { doctorId, ...(onlyVisible ? { isVisible: true } : {}) },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<ReviewWithRelations[]>;
  }

  async findByPatientId(patientId: number): Promise<ReviewWithRelations[]> {
    return this.prisma.tenant.reviews.findMany({
      where: { patientId },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<ReviewWithRelations[]>;
  }

  async setVisibility(
    id: number,
    isVisible: boolean,
  ): Promise<ReviewWithRelations | null> {
    const existing = await this.prisma.reviews.findUnique({
      where: { id },
      select: { id: true, doctorId: true },
    });
    if (!existing) return null;

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.update({
        where: { id },
        data: { isVisible },
        include: reviewInclude,
      });

      await this.recalculateDoctorRating(tx, existing.doctorId);

      return review as unknown as ReviewWithRelations;
    });
  }

  // Promedio y conteo sobre reseñas VISIBLES (una oculta no cuenta).
  private async recalculateDoctorRating(
    tx: Prisma.TransactionClient,
    doctorId: number,
  ): Promise<void> {
    const agg = await tx.reviews.aggregate({
      where: { doctorId, isVisible: true },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.doctors.update({
      where: { id: doctorId },
      data: {
        ratingAvg: agg._avg.rating,
        ratingCount: agg._count._all,
      },
    });
  }
}
