import type { PrismaService } from '../../../../prisma/prisma.service.js';
import { PrismaAppointmentRepository } from './prisma-appointment.repository.js';

describe('PrismaAppointmentRepository.expirePendingPastDeadline', () => {
  it('returns only appointments still eligible at write time', async () => {
    const now = new Date('2026-08-30T20:00:00Z');
    const expiredSlot = {
      id: 10,
      scheduleId: 20,
      startTime: new Date('1970-01-01T09:00:00Z'),
      endTime: new Date('1970-01-01T09:30:00Z'),
      clinicId: 7,
    };
    interface OutboxCreateArgs {
      data: {
        type: string;
        operationId: string;
        clinicId: number | null;
        payload: Record<string, unknown>;
      };
      skipDuplicates: boolean;
    }
    const outboxCreates: OutboxCreateArgs[] = [];
    const tx = {
      appointments: {
        updateManyAndReturn: jest.fn().mockResolvedValue([expiredSlot]),
      },
      outboxEvents: {
        createMany: jest.fn().mockImplementation((args: OutboxCreateArgs) => {
          outboxCreates.push(args);
          return Promise.resolve({ count: 1 });
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    const repository = new PrismaAppointmentRepository(
      prisma as unknown as PrismaService,
    );

    const result = await repository.expirePendingPastDeadline(now, {
      operationId: 'expiration-run',
      occurredAt: now,
    });

    expect(result).toEqual([expiredSlot]);
    expect(tx.appointments.updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        paymentStatus: { in: ['PENDING', 'FAILED'] },
        pendingUntil: { lt: now },
        deleted: false,
      },
      data: {
        status: 'CANCELLED',
        cancelReason: 'Pago no completado dentro del tiempo permitido',
        updatedAt: now,
      },
      select: {
        id: true,
        scheduleId: true,
        startTime: true,
        endTime: true,
        clinicId: true,
      },
    });
    const [createArgs] = outboxCreates;
    expect(createArgs.data).toMatchObject({
      type: 'appointment.slot_released',
      operationId: 'expiration-run:10',
      clinicId: 7,
      payload: {
        appointmentId: 10,
        scheduleId: 20,
        startTime: '1970-01-01T09:00:00.000Z',
        endTime: '1970-01-01T09:30:00.000Z',
      },
    });
  });
});
