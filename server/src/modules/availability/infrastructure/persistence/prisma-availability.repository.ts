import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import {
  CreateAvailabilityData,
  UpdateAvailabilityData,
  AvailabilityWithRelations,
} from '../../domain/interfaces/availability-data.interface.js';
import { AvailabilityEntity } from '../../domain/entities/availability.entity.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';
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

type AvailabilityRow = Prisma.AvailabilityGetPayload<{
  include: typeof availabilityInclude;
}>;

// SDD-016 (F-13): el lock advisory de replaceForDoctorSpecialty serializa el
// ORDEN de ejecución (una tx espera a que la otra libere el lock), pero
// ambas siguen siendo transacciones Serializable completas. PostgreSQL
// puede seguir detectando un conflicto de escritura real (P2034) entre
// ellas — el lock ordena, no sustituye el reintento. Mismo patrón que
// PrismaPaymentReconciliationRepository.
const MAX_REPLACE_ATTEMPTS = 3;

@Injectable()
export class PrismaAvailabilityRepository implements IAvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateAvailabilityData,
  ): Promise<AvailabilityWithRelations> {
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
        clinicId: data.clinicId ?? null,
      },
      include: availabilityInclude,
    }) as any;
  }

  async findAllPaginated(
    params: PaginationParams,
    doctorId?: number,
    clinicId?: number | null,
  ): Promise<PaginatedResult<AvailabilityWithRelations>> {
    const { limit, offset, orderBy, orderByMode } = params;

    const where = {
      isAvailable: true,
      ...(clinicId && { clinicId }),
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
    startDate?: Date | null,
    endDate?: Date | null,
  ): Promise<AvailabilityEntity[]> {
    // Date range overlap: existing.start < new.end AND existing.end > new.start
    // Null dates mean unbounded (always overlaps)
    const dateOverlapFilter =
      startDate && endDate
        ? [
            { OR: [{ startDate: null }, { startDate: { lt: endDate } }] },
            { OR: [{ endDate: null }, { endDate: { gt: startDate } }] },
          ]
        : [];

    return this.prisma.availability.findMany({
      where: {
        doctorId,
        dayOfWeek,
        isAvailable: true,
        // Las EXCEPTION son sustractivas (suprimen slots, no los generan):
        // no cuentan como solapamiento para reglas REGULAR/EXTRA nuevas.
        type: { not: 'EXCEPTION' },
        ...(excludeId && { id: { not: excludeId } }),
        // Time overlap: existente.timeFrom < nuevo.timeTo AND existente.timeTo > nuevo.timeFrom
        timeFrom: { lt: timeTo },
        timeTo: { gt: timeFrom },
        ...(dateOverlapFilter.length > 0 && { AND: dateOverlapFilter }),
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

  async findActiveByDoctorIds(
    doctorIds: number[],
  ): Promise<AvailabilityEntity[]> {
    return this.prisma.availability.findMany({
      where: {
        ...(doctorIds.length > 0 && { doctorId: { in: doctorIds } }),
        isAvailable: true,
      },
    }) as any;
  }

  async replaceForDoctorSpecialty(
    doctorId: number,
    specialtyId: number,
    entries: CreateAvailabilityData[],
  ): Promise<AvailabilityWithRelations[]> {
    for (let attempt = 1; attempt <= MAX_REPLACE_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Serializa reemplazos del mismo médico y especialidad. Sin este lock,
            // dos transacciones que desactivan el conjunto anterior antes de que la
            // otra inserte podrían dejar ambos conjuntos activos.
            await tx.$executeRaw(
              Prisma.sql`SELECT pg_advisory_xact_lock(${doctorId}, ${specialtyId})`,
            );
            await tx.availability.updateMany({
              where: { doctorId, specialtyId, isAvailable: true },
              data: { isAvailable: false, updatedAt: new Date() },
            });

            const rows: AvailabilityRow[] = [];
            for (const entry of entries) {
              rows.push(
                await tx.availability.create({
                  data: {
                    doctorId: entry.doctorId,
                    specialtyId: entry.specialtyId,
                    startDate: entry.startDate,
                    endDate: entry.endDate,
                    dayOfWeek: entry.dayOfWeek,
                    timeFrom: entry.timeFrom,
                    timeTo: entry.timeTo,
                    type: entry.type,
                    reason: entry.reason,
                    clinicId: entry.clinicId ?? null,
                  },
                  include: availabilityInclude,
                }),
              );
            }

            return rows.map((row) => this.toAvailabilityWithRelations(row));
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          attempt < MAX_REPLACE_ATTEMPTS &&
          this.isSerializationFailure(error)
        ) {
          continue;
        }
        throw error;
      }
    }

    // Inalcanzable: el bucle siempre retorna o lanza dentro de sus iteraciones.
    throw new Error(
      `No se pudo reemplazar la disponibilidad del médico ${doctorId} para la especialidad ${specialtyId} después de varios intentos`,
    );
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

  async softDeleteByDoctor(doctorId: number): Promise<number> {
    const result = await this.prisma.availability.updateMany({
      where: { doctorId, isAvailable: true },
      data: { isAvailable: false, updatedAt: new Date() },
    });
    return result.count;
  }

  private toAvailabilityWithRelations(
    row: AvailabilityRow,
  ): AvailabilityWithRelations {
    if (!row.startDate || !row.endDate) {
      throw new Error('Una regla de disponibilidad requiere rango de fechas');
    }

    return {
      id: row.id,
      doctorId: row.doctorId,
      specialtyId: row.specialtyId,
      clinicId: row.clinicId,
      startDate: row.startDate,
      endDate: row.endDate,
      dayOfWeek: row.dayOfWeek as DayOfWeek,
      timeFrom: row.timeFrom,
      timeTo: row.timeTo,
      isAvailable: row.isAvailable,
      type: row.type as AvailabilityType,
      reason: row.reason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      doctor: row.doctor,
      specialty: row.specialty,
    };
  }

  private isSerializationFailure(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  async existsDoctorSpecialty(
    doctorId: number,
    specialtyId: number,
  ): Promise<boolean> {
    const count = await this.prisma.doctorsSpecialties.count({
      where: { doctorId, specialtyId, deleted: false },
    });
    return count > 0;
  }
}
