import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  IAppointmentReminderDeliveryRepository,
  ClaimReminderDeliveryInput,
  ReminderDeliveryClaim,
} from '../../domain/repositories/appointment-reminder-delivery.repository.js';

@Injectable()
export class PrismaAppointmentReminderDeliveryRepository implements IAppointmentReminderDeliveryRepository {
  private readonly logger = new Logger(
    PrismaAppointmentReminderDeliveryRepository.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  async claim(
    input: ClaimReminderDeliveryInput,
  ): Promise<ReminderDeliveryClaim | null> {
    const claimToken = randomUUID();
    const lockedUntil = new Date(input.now.getTime() + 5 * 60_000); // 5 min lock

    // 1. Intentar crear fila como PROCESSING
    try {
      const created = await this.prisma.appointmentReminders.create({
        data: {
          appointmentId: input.appointmentId,
          kind: input.kind,
          channel: input.channel,
          scheduledFor: input.scheduledFor,
          status: 'PROCESSING',
          claimToken,
          lockedUntil,
          attemptCount: 1,
        },
      });

      return {
        id: created.id,
        appointmentId: created.appointmentId,
        kind: created.kind,
        channel: created.channel,
        scheduledFor: created.scheduledFor,
        claimToken,
      };
    } catch (error: unknown) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }

    // 2. Ya existe fila: intentar reclamar condicionalmente si está FAILED (con nextAttemptAt <= now) o PROCESSING vencido
    const updateResult = await this.prisma.appointmentReminders.updateMany({
      where: {
        appointmentId: input.appointmentId,
        kind: input.kind,
        channel: input.channel,
        scheduledFor: input.scheduledFor,
        OR: [
          {
            status: 'FAILED',
            nextAttemptAt: { lte: input.now },
          },
          {
            status: 'PROCESSING',
            lockedUntil: { lte: input.now },
          },
        ],
      },
      data: {
        status: 'PROCESSING',
        claimToken,
        lockedUntil,
        attemptCount: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    const row = await this.prisma.appointmentReminders.findUnique({
      where: {
        appointmentId_kind_channel_scheduledFor: {
          appointmentId: input.appointmentId,
          kind: input.kind,
          channel: input.channel,
          scheduledFor: input.scheduledFor,
        },
      },
    });

    if (!row || row.claimToken !== claimToken) {
      return null;
    }

    return {
      id: row.id,
      appointmentId: row.appointmentId,
      kind: row.kind,
      channel: row.channel,
      scheduledFor: row.scheduledFor,
      claimToken,
    };
  }

  async markSent(
    id: number,
    claimToken: string,
    sentAt: Date,
  ): Promise<boolean> {
    const result = await this.prisma.appointmentReminders.updateMany({
      where: {
        id,
        claimToken,
        status: 'PROCESSING',
      },
      data: {
        status: 'SENT',
        sentAt,
        claimToken: null,
        lockedUntil: null,
        nextAttemptAt: null,
        updatedAt: sentAt,
      },
    });

    return result.count > 0;
  }

  async markFailed(
    id: number,
    claimToken: string,
    nextAttemptAt: Date,
    errorCode: string,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.appointmentReminders.updateMany({
      where: {
        id,
        claimToken,
        status: 'PROCESSING',
      },
      data: {
        status: 'FAILED',
        nextAttemptAt,
        lastError: errorCode,
        claimToken: null,
        lockedUntil: null,
        updatedAt: now,
      },
    });

    return result.count > 0;
  }
}
