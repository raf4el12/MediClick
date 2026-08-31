import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  IPaymentReconciliationRepository,
  PaymentReconciliationResult,
  VerifiedPaymentSnapshot,
} from '../../domain/repositories/payment-reconciliation.repository.js';

class ReconciliationWriteConflict extends Error {}

const MAX_RECONCILIATION_ATTEMPTS = 3;

@Injectable()
export class PrismaPaymentReconciliationRepository implements IPaymentReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async reconcile(
    snapshot: VerifiedPaymentSnapshot,
  ): Promise<PaymentReconciliationResult | null> {
    for (let attempt = 1; attempt <= MAX_RECONCILIATION_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.reconcileInTransaction(tx, snapshot),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          attempt < MAX_RECONCILIATION_ATTEMPTS &&
          (error instanceof ReconciliationWriteConflict ||
            this.isSerializationFailure(error))
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ReconciliationWriteConflict(
      'No se pudo conciliar el pago después de varios intentos',
    );
  }

  private async reconcileInTransaction(
    tx: Prisma.TransactionClient,
    snapshot: VerifiedPaymentSnapshot,
  ): Promise<PaymentReconciliationResult | null> {
    const appointment = await tx.appointments.findUnique({
      where: { id: snapshot.appointmentId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        clinicId: true,
        patient: { select: { profile: { select: { userId: true } } } },
      },
    });
    if (!appointment) return null;

    const existing = await tx.transactions.findFirst({
      where: { gatewayId: snapshot.gatewayId },
      orderBy: { id: 'asc' },
    });
    if (existing && existing.appointmentId !== appointment.id) {
      throw new ConflictException(
        'El identificador del gateway ya pertenece a otra cita',
      );
    }

    const financialReviewRequired =
      snapshot.status === 'PAID' && appointment.status === 'CANCELLED';
    const metadata = this.mergeMetadata(
      existing?.metadata,
      snapshot.raw,
      financialReviewRequired,
    );

    if (existing) {
      await tx.transactions.update({
        where: { id: existing.id },
        data: {
          amount: snapshot.amount,
          currency: snapshot.currency,
          status: snapshot.status,
          paymentMethod: snapshot.paymentMethod,
          externalRef: snapshot.externalRef,
          payerEmail: snapshot.payerEmail,
          failureReason: snapshot.failureReason,
          paidAt: snapshot.paidAt,
          metadata: metadata as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else {
      const pending = await tx.transactions.findFirst({
        where: {
          appointmentId: appointment.id,
          status: 'PENDING',
          gatewayId: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (pending) {
        await tx.transactions.update({
          where: { id: pending.id },
          data: {
            amount: snapshot.amount,
            currency: snapshot.currency,
            status: snapshot.status,
            paymentMethod: snapshot.paymentMethod,
            gatewayId: snapshot.gatewayId,
            externalRef: snapshot.externalRef,
            payerEmail: snapshot.payerEmail,
            failureReason: snapshot.failureReason,
            paidAt: snapshot.paidAt,
            metadata: metadata as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.transactions.create({
          data: {
            appointmentId: appointment.id,
            amount: snapshot.amount,
            currency: snapshot.currency,
            status: snapshot.status,
            paymentMethod: snapshot.paymentMethod,
            gatewayId: snapshot.gatewayId,
            externalRef: snapshot.externalRef,
            payerEmail: snapshot.payerEmail,
            failureReason: snapshot.failureReason,
            paidAt: snapshot.paidAt,
            metadata: metadata as Prisma.InputJsonValue,
            clinicId: appointment.clinicId,
          },
        });
      }
    }

    const appointmentStatus =
      snapshot.status === 'PAID' && appointment.status === 'PENDING'
        ? 'CONFIRMED'
        : appointment.status;

    const updated = await tx.appointments.updateMany({
      where: {
        id: appointment.id,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
      },
      data: {
        paymentStatus: snapshot.status,
        amount: snapshot.amount,
        ...(appointmentStatus !== appointment.status && {
          status: appointmentStatus,
          pendingUntil: null,
        }),
        updatedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new ReconciliationWriteConflict(
        `La cita ${appointment.id} cambió durante la conciliación`,
      );
    }

    return {
      appointmentId: appointment.id,
      appointmentStatus,
      paymentStatus: snapshot.status,
      financialReviewRequired,
      notificationUserId:
        snapshot.status === 'PAID' && appointment.status === 'PENDING'
          ? appointment.patient.profile.userId
          : null,
      clinicId: appointment.clinicId,
    };
  }

  private mergeMetadata(
    previous: unknown,
    gatewayRaw: unknown,
    financialReviewRequired: boolean,
  ): Record<string, unknown> {
    const gatewayMetadata = this.asRecord(gatewayRaw);
    const previousMetadata = this.asRecord(previous);
    return {
      ...gatewayMetadata,
      ...previousMetadata,
      ...(financialReviewRequired && {
        needsFinancialReview: true,
        financialReviewReason: 'Pago aprobado para una cita cancelada',
        financialReviewRequestedAt: new Date().toISOString(),
      }),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private isSerializationFailure(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }
}
