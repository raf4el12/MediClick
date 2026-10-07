import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { tenantStorage } from '../../../../prisma/tenant-context.js';
import { IReviewRepository } from '../../domain/repositories/review.repository.js';
import {
  CreateReviewData,
  ReviewModerationFilters,
  ReviewWithRelations,
} from '../../domain/interfaces/review-data.interface.js';
import type { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

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

const doctorClinicScope = (clinicId: number | null) =>
  clinicId === null ? {} : { doctor: { clinicId } };

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
    scopeClinicId: number | null,
  ): Promise<ReviewWithRelations[]> {
    return this.prisma.reviews.findMany({
      where: {
        doctorId,
        ...(onlyVisible ? { isVisible: true } : {}),
        ...doctorClinicScope(scopeClinicId),
      },
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
    scopeClinicId: number | null,
  ): Promise<ReviewWithRelations | null> {
    // El callback de $transaction no hereda el tenant: el alcance de sede se
    // aplica explícitamente, por la sede del médico de la reseña.
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.reviews.findFirst({
        where: { id, ...doctorClinicScope(scopeClinicId) },
        select: { id: true, doctorId: true },
      });
      if (!existing) return null;

      const review = await tx.reviews.update({
        where: { id },
        data: { isVisible },
        include: reviewInclude,
      });
      await this.recalculateDoctorRating(tx, existing.doctorId);
      return review as unknown as ReviewWithRelations;
    });
  }

  async findForModeration(
    filters: ReviewModerationFilters,
    page: { offset: number; limit: number },
  ): Promise<PaginatedResult<ReviewWithRelations>> {
    const where: Prisma.ReviewsWhereInput = {
      ...doctorClinicScope(filters.clinicId),
      ...(filters.isVisible !== undefined && { isVisible: filters.isVisible }),
      ...(filters.rating !== undefined && { rating: filters.rating }),
      ...(filters.doctorId !== undefined && { doctorId: filters.doctorId }),
    };
    const [rows, totalRows] = await Promise.all([
      this.prisma.reviews.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.reviews.count({ where }),
    ]);

    return {
      totalRows,
      totalPages: Math.ceil(totalRows / page.limit),
      currentPage: Math.floor(page.offset / page.limit) + 1,
      rows: rows as unknown as ReviewWithRelations[],
    };
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
