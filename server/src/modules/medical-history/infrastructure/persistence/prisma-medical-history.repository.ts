import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';
import {
  CreateMedicalHistoryData,
  UpdateMedicalHistoryData,
  MedicalHistoryResult,
  MedicalHistoryFilters,
  PaginatedMedicalHistory,
} from '../../domain/interfaces/medical-history-data.interface.js';

const medicalHistoryInclude = {
  patient: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true } },
    },
  },
} as const;

@Injectable()
export class PrismaMedicalHistoryRepository implements IMedicalHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMedicalHistoryData): Promise<MedicalHistoryResult> {
    return this.prisma.medicalHistory.create({
      data: {
        patientId: data.patientId,
        condition: data.condition,
        description: data.description,
        diagnosedDate: data.diagnosedDate,
        status: (data.status as any) ?? 'ACTIVE',
        notes: data.notes,
      },
      include: medicalHistoryInclude,
    }) as any;
  }

  async findByPatientId(
    patientId: number,
    filters: MedicalHistoryFilters,
  ): Promise<PaginatedMedicalHistory> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { patientId, deleted: false };
    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.medicalHistory.findMany({
        where,
        include: medicalHistoryInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.medicalHistory.count({ where }),
    ]);

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number): Promise<MedicalHistoryResult | null> {
    const result = await this.prisma.medicalHistory.findFirst({
      where: { id, deleted: false },
      include: medicalHistoryInclude,
    });
    return result as any;
  }

  async update(
    id: number,
    data: UpdateMedicalHistoryData,
  ): Promise<MedicalHistoryResult> {
    return this.prisma.medicalHistory.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: medicalHistoryInclude,
    }) as any;
  }

  async updateStatus(
    id: number,
    status: string,
  ): Promise<MedicalHistoryResult> {
    return this.prisma.medicalHistory.update({
      where: { id },
      data: { status: status as any, updatedAt: new Date() },
      include: medicalHistoryInclude,
    }) as any;
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.medicalHistory.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }
}
