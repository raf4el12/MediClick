import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import type {
  CreateWaitlistOfferData,
  WaitlistOfferWithEntry,
} from '../../domain/interfaces/waitlist-data.interface.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';
import { waitlistOfferInclude, mapOffer } from './waitlist.mappers.js';

@Injectable()
export class PrismaWaitlistOfferRepository implements IWaitlistOfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateWaitlistOfferData): Promise<WaitlistOfferWithEntry> {
    const result = await this.prisma.waitlistOffers.create({
      data: {
        waitlistEntryId: data.waitlistEntryId,
        scheduleId: data.scheduleId,
        startTime: data.startTime,
        endTime: data.endTime,
        expiresAt: data.expiresAt,
        clinicId: data.clinicId ?? null,
      },
      include: waitlistOfferInclude,
    });
    return mapOffer(result);
  }

  async findById(id: number): Promise<WaitlistOfferWithEntry | null> {
    const result = await this.prisma.waitlistOffers.findUnique({
      where: { id },
      include: waitlistOfferInclude,
    });
    return result ? mapOffer(result) : null;
  }

  async findPendingByPatient(
    patientId: number,
  ): Promise<WaitlistOfferWithEntry[]> {
    const rows = await this.prisma.waitlistOffers.findMany({
      where: {
        status: WaitlistOfferStatus.PENDING,
        expiresAt: { gt: new Date() },
        entry: { patientId },
      },
      orderBy: { expiresAt: 'asc' },
      include: waitlistOfferInclude,
    });
    return rows.map(mapOffer);
  }

  async claimPending(
    offerId: number,
    now: Date,
  ): Promise<WaitlistOfferWithEntry | null> {
    // Claim atómico: solo gana quien encuentra la oferta aún PENDING y vigente.
    const result = await this.prisma.waitlistOffers.updateMany({
      where: {
        id: offerId,
        status: WaitlistOfferStatus.PENDING,
        expiresAt: { gt: now },
      },
      data: { status: WaitlistOfferStatus.ACCEPTED, acceptedAt: now },
    });
    if (result.count === 0) return null;
    return this.findById(offerId);
  }

  async markRejected(offerId: number): Promise<WaitlistOfferWithEntry | null> {
    const result = await this.prisma.waitlistOffers.updateMany({
      where: { id: offerId, status: WaitlistOfferStatus.PENDING },
      data: { status: WaitlistOfferStatus.REJECTED, rejectedAt: new Date() },
    });
    if (result.count === 0) return null;
    return this.findById(offerId);
  }

  async setCreatedAppointment(
    offerId: number,
    appointmentId: number,
  ): Promise<void> {
    await this.prisma.waitlistOffers.update({
      where: { id: offerId },
      data: { createdAppointmentId: appointmentId },
    });
  }

  async expireStaleReturning(now: Date): Promise<WaitlistOfferWithEntry[]> {
    return this.prisma.$transaction(async (tx) => {
      const stale = await tx.waitlistOffers.findMany({
        where: { status: WaitlistOfferStatus.PENDING, expiresAt: { lt: now } },
        include: waitlistOfferInclude,
      });
      if (stale.length === 0) return [];

      await tx.waitlistOffers.updateMany({
        where: { id: { in: stale.map((o) => o.id) } },
        data: { status: WaitlistOfferStatus.EXPIRED },
      });

      return stale.map((o) =>
        mapOffer({ ...o, status: WaitlistOfferStatus.EXPIRED }),
      );
    });
  }
}
