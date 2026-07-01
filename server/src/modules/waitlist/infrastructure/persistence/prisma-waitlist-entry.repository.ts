import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import type {
  CreateWaitlistEntryData,
  UpdateWaitlistEntryData,
  WaitlistEntryWithRelations,
  WaitlistMatchCriteria,
} from '../../domain/interfaces/waitlist-data.interface.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';
import { waitlistEntryInclude, mapEntry } from './waitlist.mappers.js';

@Injectable()
export class PrismaWaitlistEntryRepository implements IWaitlistEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateWaitlistEntryData,
  ): Promise<WaitlistEntryWithRelations> {
    const result = await this.prisma.waitlistEntries.create({
      data: {
        patientId: data.patientId,
        specialtyId: data.specialtyId,
        doctorId: data.doctorId ?? null,
        clinicId: data.clinicId ?? null,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        ...(data.timePreference && { timePreference: data.timePreference }),
        ...(data.priority !== undefined && { priority: data.priority }),
        waitUntil: data.waitUntil ?? null,
        notes: data.notes ?? null,
      },
      include: waitlistEntryInclude,
    });
    return mapEntry(result);
  }

  async findById(id: number): Promise<WaitlistEntryWithRelations | null> {
    const result = await this.prisma.waitlistEntries.findUnique({
      where: { id },
      include: waitlistEntryInclude,
    });
    return result ? mapEntry(result) : null;
  }

  async update(
    id: number,
    data: UpdateWaitlistEntryData,
  ): Promise<WaitlistEntryWithRelations> {
    const result = await this.prisma.waitlistEntries.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.fulfilledAt !== undefined && {
          fulfilledAt: data.fulfilledAt,
        }),
        updatedAt: data.updatedAt ?? new Date(),
      },
      include: waitlistEntryInclude,
    });
    return mapEntry(result);
  }

  async findByPatient(
    patientId: number,
    statuses?: WaitlistEntryStatus[],
  ): Promise<WaitlistEntryWithRelations[]> {
    const rows = await this.prisma.waitlistEntries.findMany({
      where: {
        patientId,
        ...(statuses && statuses.length > 0 && { status: { in: statuses } }),
      },
      orderBy: { createdAt: 'desc' },
      include: waitlistEntryInclude,
    });
    return rows.map(mapEntry);
  }

  async findActiveByClinic(
    clinicId: number | null,
    filters?: { specialtyId?: number; doctorId?: number },
  ): Promise<WaitlistEntryWithRelations[]> {
    const rows = await this.prisma.waitlistEntries.findMany({
      where: {
        clinicId,
        status: WaitlistEntryStatus.ACTIVE,
        ...(filters?.specialtyId && { specialtyId: filters.specialtyId }),
        ...(filters?.doctorId && { doctorId: filters.doctorId }),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: waitlistEntryInclude,
    });
    return rows.map(mapEntry);
  }

  async findNextMatch(
    criteria: WaitlistMatchCriteria,
  ): Promise<WaitlistEntryWithRelations | null> {
    const result = await this.prisma.waitlistEntries.findFirst({
      where: {
        status: WaitlistEntryStatus.ACTIVE,
        clinicId: criteria.clinicId,
        specialtyId: criteria.specialtyId,
        OR: [{ doctorId: criteria.doctorId }, { doctorId: null }],
        dateFrom: { lte: criteria.scheduleDate },
        dateTo: { gte: criteria.scheduleDate },
        timePreference: { in: criteria.timeBuckets },
        // Excluye entradas con una oferta PENDING vigente o que ya rechazaron/dejaron
        // expirar este mismo slot (evita reofrecer lo que el paciente descartó).
        offers: {
          none: {
            OR: [
              { status: WaitlistOfferStatus.PENDING },
              {
                scheduleId: criteria.scheduleId,
                startTime: criteria.startTime,
                status: {
                  in: [
                    WaitlistOfferStatus.REJECTED,
                    WaitlistOfferStatus.EXPIRED,
                  ],
                },
              },
            ],
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: waitlistEntryInclude,
    });
    return result ? mapEntry(result) : null;
  }

  async existsActiveDuplicate(
    patientId: number,
    specialtyId: number,
    doctorId: number | null,
  ): Promise<boolean> {
    const count = await this.prisma.waitlistEntries.count({
      where: {
        patientId,
        specialtyId,
        doctorId,
        status: WaitlistEntryStatus.ACTIVE,
      },
    });
    return count > 0;
  }

  async expireStale(now: Date): Promise<number> {
    const result = await this.prisma.waitlistEntries.updateMany({
      where: {
        status: WaitlistEntryStatus.ACTIVE,
        waitUntil: { not: null, lt: now },
      },
      data: { status: WaitlistEntryStatus.EXPIRED, updatedAt: now },
    });
    return result.count;
  }

  async incrementPriority(
    id: number,
    delta: number,
  ): Promise<WaitlistEntryWithRelations> {
    const result = await this.prisma.waitlistEntries.update({
      where: { id },
      data: { priority: { increment: delta }, updatedAt: new Date() },
      include: waitlistEntryInclude,
    });
    return mapEntry(result);
  }
}
