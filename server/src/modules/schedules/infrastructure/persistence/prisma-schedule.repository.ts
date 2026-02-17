import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import {
  ScheduleWithRelations,
  CreateScheduleData,
} from '../../domain/interfaces/schedule-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

const scheduleInclude = {
  doctor: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true } },
    },
  },
  specialty: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PrismaScheduleRepository implements IScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: CreateScheduleData[]): Promise<number> {
    const result = await this.prisma.schedules.createMany({
      data: data.map((d) => ({
        doctorId: d.doctorId,
        specialtyId: d.specialtyId,
        scheduleDate: d.scheduleDate,
        timeFrom: d.timeFrom,
        timeTo: d.timeTo,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async findAllPaginated(
    params: PaginationParams,
    filters: {
      doctorId?: number;
      specialtyId?: number;
      dateFrom?: Date;
      dateTo?: Date;
      onlyAvailable?: boolean;
    },
  ): Promise<PaginatedResult<ScheduleWithRelations>> {
    const { limit, offset, orderBy, orderByMode } = params;

    // Zona horaria Perú (UTC-5)
    const nowPeru = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }),
    );
    const todayStart = new Date(
      nowPeru.getFullYear(),
      nowPeru.getMonth(),
      nowPeru.getDate(),
    );

    // Nunca devolver fechas pasadas: forzar dateFrom >= hoy
    const effectiveDateFrom =
      filters.dateFrom && filters.dateFrom > todayStart
        ? filters.dateFrom
        : todayStart;

    const where: Record<string, any> = {
      ...(filters.doctorId && { doctorId: filters.doctorId }),
      ...(filters.specialtyId && { specialtyId: filters.specialtyId }),
      scheduleDate: {
        gte: effectiveDateFrom,
        ...(filters.dateTo && { lte: filters.dateTo }),
      },
      // Excluir horarios que ya tienen cita activa
      ...(filters.onlyAvailable && {
        appointments: {
          none: {
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            deleted: false,
          },
        },
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.schedules.findMany({
        where,
        include: scheduleInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'scheduleDate']: orderByMode || 'asc' },
      }),
      this.prisma.schedules.count({ where }),
    ]);

    return {
      totalRows: count,
      rows: rows as any,
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<ScheduleWithRelations | null> {
    const result = await this.prisma.schedules.findUnique({
      where: { id },
      include: scheduleInclude,
    });
    return result as any;
  }

  async existsSchedule(
    doctorId: number,
    scheduleDate: Date,
    timeFrom: Date,
    timeTo: Date,
  ): Promise<boolean> {
    const count = await this.prisma.schedules.count({
      where: { doctorId, scheduleDate, timeFrom, timeTo },
    });
    return count > 0;
  }

  async findExistingDates(
    doctorId: number,
    dates: Date[],
  ): Promise<{ scheduleDate: Date; timeFrom: Date; timeTo: Date }[]> {
    if (dates.length === 0) return [];

    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    return this.prisma.schedules.findMany({
      where: {
        doctorId,
        scheduleDate: { gte: minDate, lte: maxDate },
      },
      select: { scheduleDate: true, timeFrom: true, timeTo: true },
    });
  }
}
