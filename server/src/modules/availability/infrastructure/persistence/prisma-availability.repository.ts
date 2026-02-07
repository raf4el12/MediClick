import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import {
  CreateAvailabilityData,
  UpdateAvailabilityData,
  AvailabilityWithRelations,
} from '../../domain/interfaces/availability-data.interface.js';
import { AvailabilityEntity } from '../../domain/entities/availability.entity.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

const availabilityInclude = {
  doctor: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true } },
    },
  },
  specialty: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PrismaAvailabilityRepository implements IAvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAvailabilityData): Promise<AvailabilityWithRelations> {
    return this.prisma.availability.create({
      data: {
        doctorId: data.doctorId,
        specialtyId: data.specialtyId,
        startDate: data.startDate,
        endDate: data.endDate,
        dayOfWeek: data.dayOfWeek,
        timeFrom: data.timeFrom,
        timeTo: data.timeTo,
        type: data.type,
        reason: data.reason,
      },
      include: availabilityInclude,
    }) as any;
  }

  async findAllPaginated(
    params: PaginationParams,
    doctorId?: number,
  ): Promise<PaginatedResult<AvailabilityWithRelations>> {
    const { limit, offset, orderBy, orderByMode } = params;

    const where = {
      isAvailable: true,
      ...(doctorId && { doctorId }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.availability.findMany({
        where,
        include: availabilityInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'createdAt']: orderByMode || 'desc' },
      }),
      this.prisma.availability.count({ where }),
    ]);

    return {
      totalRows: count,
      rows: rows as any,
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<AvailabilityWithRelations | null> {
    const result = await this.prisma.availability.findUnique({
      where: { id },
      include: availabilityInclude,
    });
    return result as any;
  }

  async findOverlapping(
    doctorId: number,
    dayOfWeek: DayOfWeek,
    timeFrom: Date,
    timeTo: Date,
    excludeId?: number,
  ): Promise<AvailabilityEntity[]> {
    return this.prisma.availability.findMany({
      where: {
        doctorId,
        dayOfWeek,
        isAvailable: true,
        ...(excludeId && { id: { not: excludeId } }),
        // Overlap: existente.timeFrom < nuevo.timeTo AND existente.timeTo > nuevo.timeFrom
        timeFrom: { lt: timeTo },
        timeTo: { gt: timeFrom },
      },
    }) as any;
  }

  async findByDoctorAndDay(
    doctorId: number,
    dayOfWeek: DayOfWeek,
  ): Promise<AvailabilityEntity[]> {
    return this.prisma.availability.findMany({
      where: {
        doctorId,
        dayOfWeek,
        isAvailable: true,
      },
    }) as any;
  }

  async findActiveByDoctorIds(doctorIds: number[]): Promise<AvailabilityEntity[]> {
    return this.prisma.availability.findMany({
      where: {
        ...(doctorIds.length > 0 && { doctorId: { in: doctorIds } }),
        isAvailable: true,
      },
    }) as any;
  }

  async update(
    id: number,
    data: UpdateAvailabilityData,
  ): Promise<AvailabilityWithRelations> {
    return this.prisma.availability.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: availabilityInclude,
    }) as any;
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.availability.update({
      where: { id },
      data: { isAvailable: false, updatedAt: new Date() },
    });
  }

  async existsDoctorSpecialty(doctorId: number, specialtyId: number): Promise<boolean> {
    const count = await this.prisma.doctorsSpecialties.count({
      where: { doctorId, specialtyId, deleted: false },
    });
    return count > 0;
  }
}
