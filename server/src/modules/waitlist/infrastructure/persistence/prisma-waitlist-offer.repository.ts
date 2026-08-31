import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import {
  AcceptOfferAtomicallyError,
  type AcceptedWaitlistOffer,
} from '../../domain/repositories/waitlist-offer.repository.js';
import type {
  CreateWaitlistOfferData,
  WaitlistOfferWithEntry,
} from '../../domain/interfaces/waitlist-data.interface.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { waitlistOfferInclude, mapOffer } from './waitlist.mappers.js';
import {
  buildDoctorOverlapWhere,
  buildPatientOverlapWhere,
} from '../../../appointments/infrastructure/persistence/appointment-overlap.utils.js';

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

  async acceptOfferAtomically(input: {
    offerId: number;
    patientId: number;
    now: Date;
    pendingUntil: Date;
    amount: number | null;
    reason?: string;
  }): Promise<AcceptedWaitlistOffer> {
    const { offerId, patientId, now, pendingUntil, amount, reason } = input;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Reclamo atómico: solo gana quien encuentra la oferta PENDING,
          // vigente y perteneciente al paciente. Un doble-click o una segunda
          // aceptación concurrente afecta 0 filas y falla aquí, dentro de la tx.
          const claim = await tx.waitlistOffers.updateMany({
            where: {
              id: offerId,
              status: WaitlistOfferStatus.PENDING,
              expiresAt: { gt: now },
              entry: { patientId },
            },
            data: { status: WaitlistOfferStatus.ACCEPTED, acceptedAt: now },
          });
          if (claim.count === 0) {
            throw new AcceptOfferAtomicallyError('OFFER_NOT_CLAIMABLE');
          }

          const offerRow = await tx.waitlistOffers.findUniqueOrThrow({
            where: { id: offerId },
            include: waitlistOfferInclude,
          });

          // 2. Revalida overlap doctor + paciente dentro de la MISMA transacción
          // serializable. Protege contra una reserva directa concurrente que
          // haya tomado el slot entre la creación de la oferta y esta aceptación.
          const schedule = await tx.schedules.findUnique({
            where: { id: offerRow.scheduleId },
            select: { doctorId: true, scheduleDate: true },
          });
          if (!schedule) {
            throw new AcceptOfferAtomicallyError('SLOT_OVERLAP');
          }

          const [doctorOverlap, patientOverlap] = await Promise.all([
            tx.appointments.count({
              where: buildDoctorOverlapWhere(
                schedule.doctorId,
                schedule.scheduleDate,
                offerRow.startTime,
                offerRow.endTime,
              ),
            }),
            tx.appointments.count({
              where: buildPatientOverlapWhere(
                patientId,
                schedule.scheduleDate,
                offerRow.startTime,
                offerRow.endTime,
              ),
            }),
          ]);
          if (doctorOverlap > 0 || patientOverlap > 0) {
            throw new AcceptOfferAtomicallyError('SLOT_OVERLAP');
          }

          // 3. Crea la cita ya con amount + pendingUntil: nunca queda una cita
          // pendiente sin plazo ni precio (cierra el gap G-01).
          const appointment = await tx.appointments.create({
            data: {
              patientId,
              scheduleId: offerRow.scheduleId,
              startTime: offerRow.startTime,
              endTime: offerRow.endTime,
              reason: reason ?? 'Reserva desde lista de espera',
              clinicId: offerRow.clinicId,
              ...(amount != null && amount > 0 && { amount }),
              pendingUntil,
            },
            include: {
              schedule: {
                select: {
                  doctor: {
                    select: {
                      profile: { select: { name: true, lastName: true } },
                    },
                  },
                },
              },
            },
          });

          // 4. Cierra la entrada de lista de espera.
          await tx.waitlistEntries.update({
            where: { id: offerRow.waitlistEntryId },
            data: { status: WaitlistEntryStatus.FULFILLED, fulfilledAt: now },
          });

          // 5. Vincula la cita creada a la oferta ya ACCEPTED.
          const updatedOffer = await tx.waitlistOffers.update({
            where: { id: offerId },
            data: { createdAppointmentId: appointment.id },
            include: waitlistOfferInclude,
          });

          return {
            offer: mapOffer(updatedOffer),
            appointment: {
              id: appointment.id,
              scheduleId: appointment.scheduleId,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              status: appointment.status,
              paymentStatus: appointment.paymentStatus,
              amount: appointment.amount ? Number(appointment.amount) : null,
              pendingUntil: appointment.pendingUntil ?? null,
              schedule: appointment.schedule,
            },
          };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      // P2034: conflicto de serialización/deadlock detectado por PostgreSQL
      // bajo Serializable. Bajo carga concurrente, el motor puede abortar una
      // de las dos transacciones que compiten por la misma oferta ANTES de
      // que nuestro `updateMany` condicional llegue a devolver count=0; es la
      // misma garantía (solo una gana), manifestada como abort en vez de
      // "0 filas afectadas". Ambos casos son "no se pudo reclamar la oferta".
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new AcceptOfferAtomicallyError('OFFER_NOT_CLAIMABLE');
      }
      throw error;
    }
  }
}
