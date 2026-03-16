import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import {
  CreateHolidayData,
  UpdateHolidayData,
} from '../../domain/interfaces/holiday-data.interface.js';
import { HolidayEntity } from '../../domain/entities/holiday.entity.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

@Injectable()
export class PrismaHolidayRepository implements IHolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateHolidayData): Promise<HolidayEntity> {
    return this.prisma.holidays.create({ data });
  }

  async createMany(data: CreateHolidayData[]): Promise<number> {
    const result = await this.prisma.holidays.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  async findAllPaginated(
    params: PaginationParams,
    year?: number,
  ): Promise<PaginatedResult<HolidayEntity>> {
    const { limit, offset, searchValue, orderBy, orderByMode } = params;

    const where = {
      isActive: true,
      ...(year && { year }),
      ...(searchValue && {
        name: {
          contains: searchValue,
          mode: 'insensitive' as const,
        },
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.holidays.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'date']: orderByMode || 'asc' },
      }),
      this.prisma.holidays.count({ where }),
    ]);

    return {
      totalRows: count,
      rows,
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<HolidayEntity | null> {
    return this.prisma.holidays.findUnique({
      where: { id },
    });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<HolidayEntity[]> {
    return this.prisma.holidays.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        isActive: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  async findByYear(year: number): Promise<HolidayEntity[]> {
    return this.prisma.holidays.findMany({
      where: {
        year,
        isActive: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  async isHoliday(date: Date): Promise<boolean> {
    // Normalizar la fecha al inicio del día
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.prisma.holidays.count({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        isActive: true,
      },
    });

    return count > 0;
  }

  async findRecurring(): Promise<HolidayEntity[]> {
    return this.prisma.holidays.findMany({
      where: { isRecurring: true, isActive: true },
      orderBy: { date: 'asc' },
    });
  }

  async findDistinctYears(): Promise<number[]> {
    const result = await this.prisma.holidays.groupBy({
      by: ['year'],
      where: { isActive: true },
      orderBy: { year: 'asc' },
    });
    return result.map((r) => r.year);
  }

  async deleteByNameAndYear(name: string, years: number[]): Promise<number> {
    const result = await this.prisma.holidays.deleteMany({
      where: { name, year: { in: years } },
    });
    return result.count;
  }

  async update(id: number, data: UpdateHolidayData): Promise<HolidayEntity> {
    return this.prisma.holidays.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.holidays.delete({
      where: { id },
    });
  }

  async deleteByYear(year: number): Promise<number> {
    const result = await this.prisma.holidays.deleteMany({
      where: { year },
    });
    return result.count;
  }
}
