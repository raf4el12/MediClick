import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import {
  ScheduleWithRelations,
  ScheduleWithAvailability,
  ScheduleWithBookedSlots,
  CreateScheduleData,
} from '../../domain/interfaces/schedule-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';
import { todayStartInTimezone, utcDayRange } from '../../../../shared/utils/date-time.utils.js';

const scheduleInclude = {
  doctor: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true } },
      clinic: { select: { timezone: true } },
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
        clinicId: d.clinicId ?? null,
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
      timezone?: string;
      clinicId?: number;
    },
  ): Promise<PaginatedResult<ScheduleWithRelations>> {
    const { limit, offset, orderBy, orderByMode } = params;

    // Zona horaria de la sede (o fallback America/Lima)
    const todayStart = todayStartInTimezone(filters.timezone ?? 'America/Lima');

    // Nunca devolver fechas pasadas: forzar dateFrom >= hoy
    const effectiveDateFrom =
      filters.dateFrom && filters.dateFrom > todayStart
        ? filters.dateFrom
        : todayStart;

    const where: Record<string, any> = {
      ...(filters.doctorId && { doctorId: filters.doctorId }),
      ...(filters.specialtyId && { specialtyId: filters.specialtyId }),
      ...(filters.clinicId
        ? { OR: [{ clinicId: null }, { clinicId: filters.clinicId }] }
        : {}),
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

  async deleteUnbookedByDoctorAndDateRange(
    doctorId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<number> {
    const result = await this.prisma.schedules.deleteMany({
      where: {
        doctorId,
        scheduleDate: { gte: dateFrom, lte: dateTo },
        // Solo eliminar los que NO tienen citas activas
        appointments: {
          none: {
            deleted: false,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        },
      },
    });
    return result.count;
  }

  async findByDoctorAndDate(
    doctorId: number,
    date: Date,
    specialtyId?: number,
  ): Promise<ScheduleWithAvailability[]> {
    const { start: startOfDay, end: endOfDay } = utcDayRange(date);

    const rows = await this.prisma.schedules.findMany({
      where: {
        doctorId,
        ...(specialtyId && { specialtyId }),
        scheduleDate: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        appointments: {
          where: {
            deleted: false,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
          select: { id: true },
        },
      },
      orderBy: { timeFrom: 'asc' },
    });

    return rows.map((s) => ({
      id: s.id,
      doctorId: s.doctorId,
      specialtyId: s.specialtyId,
      scheduleDate: s.scheduleDate,
      timeFrom: s.timeFrom,
      timeTo: s.timeTo,
      hasActiveAppointment: (s as any).appointments.length > 0,
    }));
  }

  async findByDoctorDateWithBookedSlots(
    doctorId: number,
    date: Date,
    specialtyId: number,
  ): Promise<ScheduleWithBookedSlots[]> {
    // Usar UTC para evitar desfase por timezone del servidor
    const startOfDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const endOfDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
    );

    const rows = await this.prisma.schedules.findMany({
      where: {
        doctorId,
        specialtyId,
        scheduleDate: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        appointments: {
          where: {
            deleted: false,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
          select: { startTime: true, endTime: true },
        },
      },
      orderBy: { timeFrom: 'asc' },
    });

    return rows.map((s) => ({
      id: s.id,
      doctorId: s.doctorId,
      specialtyId: s.specialtyId,
      scheduleDate: s.scheduleDate,
      timeFrom: s.timeFrom,
      timeTo: s.timeTo,
      bookedSlots: (s as any).appointments.map(
        (a: { startTime: Date; endTime: Date }) => ({
          startTime: a.startTime,
          endTime: a.endTime,
        }),
      ),
    }));
  }
}
