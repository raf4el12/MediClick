import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import {
  CreateScheduleBlockData,
  UpdateScheduleBlockData,
  ScheduleBlockWithDoctor,
} from '../../domain/interfaces/schedule-block-data.interface.js';
import { ScheduleBlockEntity } from '../../domain/entities/schedule-block.entity.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

const scheduleBlockInclude = {
  doctor: {
    select: {
      id: true,
      profile: {
        select: {
          name: true,
          lastName: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class PrismaScheduleBlockRepository implements IScheduleBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateScheduleBlockData,
  ): Promise<ScheduleBlockWithDoctor> {
    return this.prisma.scheduleBlocks.create({
      data: {
        doctorId: data.doctorId,
        type: data.type as any,
        startDate: data.startDate,
        endDate: data.endDate,
        timeFrom: data.timeFrom ?? null,
        timeTo: data.timeTo ?? null,
        reason: data.reason,
      },
      include: scheduleBlockInclude,
    });
  }

  async findAllPaginated(
    params: PaginationParams,
    doctorId?: number,
  ): Promise<PaginatedResult<ScheduleBlockWithDoctor>> {
    const { limit, offset, orderBy, orderByMode } = params;

    const where = {
      isActive: true,
      ...(doctorId && { doctorId }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.scheduleBlocks.findMany({
        where,
        include: scheduleBlockInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'startDate']: orderByMode || 'desc' },
      }),
      this.prisma.scheduleBlocks.count({ where }),
    ]);

    return {
      totalRows: count,
      rows,
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<ScheduleBlockWithDoctor | null> {
    return this.prisma.scheduleBlocks.findFirst({
      where: { id, isActive: true },
      include: scheduleBlockInclude,
    });
  }

  async findActiveByDoctorAndDateRange(
    doctorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ScheduleBlockEntity[]> {
    return this.prisma.scheduleBlocks.findMany({
      where: {
        doctorId,
        isActive: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }

  async isBlocked(
    doctorId: number,
    date: Date,
    timeFrom?: Date,
    timeTo?: Date,
  ): Promise<boolean> {
    // 1. Verificar bloqueos de día completo
    const fullDayBlock = await this.prisma.scheduleBlocks.findFirst({
      where: {
        doctorId,
        type: 'FULL_DAY',
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (fullDayBlock) {
      return true;
    }

    // 2. Verificar bloqueos por rango de hora si se proporcionan horarios
    if (timeFrom && timeTo) {
      const timeRangeBlock = await this.prisma.scheduleBlocks.findFirst({
        where: {
          doctorId,
          type: 'TIME_RANGE',
          isActive: true,
          startDate: { lte: date },
          endDate: { gte: date },
          timeFrom: { lt: timeTo },
          timeTo: { gt: timeFrom },
        },
      });

      if (timeRangeBlock) {
        return true;
      }
    }

    return false;
  }

  async update(
    id: number,
    data: UpdateScheduleBlockData,
  ): Promise<ScheduleBlockWithDoctor> {
    return this.prisma.scheduleBlocks.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type as any }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.timeFrom !== undefined && { timeFrom: data.timeFrom }),
        ...(data.timeTo !== undefined && { timeTo: data.timeTo }),
        ...(data.reason !== undefined && { reason: data.reason }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      },
      include: scheduleBlockInclude,
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.scheduleBlocks.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
  }
}
