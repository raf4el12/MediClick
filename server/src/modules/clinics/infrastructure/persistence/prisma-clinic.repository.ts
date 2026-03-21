import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  IClinicRepository,
  CreateClinicData,
  UpdateClinicData,
} from '../../domain/repositories/clinic.repository.js';
import { ClinicEntity } from '../../domain/entities/clinic.entity.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

@Injectable()
export class PrismaClinicRepository implements IClinicRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClinicData): Promise<ClinicEntity> {
    return this.prisma.clinics.create({ data });
  }

  async findAllPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResult<ClinicEntity>> {
    const { limit, offset, searchValue, orderBy, orderByMode } = params;

    const where = {
      deleted: false,
      ...(searchValue && {
        OR: [
          { name: { contains: searchValue, mode: 'insensitive' as const } },
          { address: { contains: searchValue, mode: 'insensitive' as const } },
          { email: { contains: searchValue, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.clinics.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'name']: orderByMode || 'asc' },
      }),
      this.prisma.clinics.count({ where }),
    ]);

    return {
      totalRows: count,
      rows,
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<ClinicEntity | null> {
    return this.prisma.clinics.findFirst({
      where: { id, deleted: false },
    });
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma.clinics.count({
      where: { name, deleted: false },
    });
    return count > 0;
  }

  async existsByNameExcluding(
    name: string,
    excludeId: number,
  ): Promise<boolean> {
    const count = await this.prisma.clinics.count({
      where: { name, deleted: false, id: { not: excludeId } },
    });
    return count > 0;
  }

  async update(id: number, data: UpdateClinicData): Promise<ClinicEntity> {
    return this.prisma.clinics.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.clinics.update({
      where: { id },
      data: { deleted: true, isActive: false, updatedAt: new Date() },
    });
  }

  async findTimezoneByDoctorId(doctorId: number): Promise<string | null> {
    const doctor = await this.prisma.doctors.findUnique({
      where: { id: doctorId },
      select: { clinic: { select: { timezone: true } } },
    });
    return doctor?.clinic?.timezone ?? null;
  }

  async findClinicIdByDoctorId(doctorId: number): Promise<number | null> {
    const doctor = await this.prisma.doctors.findUnique({
      where: { id: doctorId },
      select: { clinicId: true },
    });
    return doctor?.clinicId ?? null;
  }
}
