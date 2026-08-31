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
    const prisma = {
      appointments: {
        updateManyAndReturn: jest.fn().mockResolvedValue([expiredSlot]),
      },
    };
    const repository = new PrismaAppointmentRepository(prisma as any);

    const result = await repository.expirePendingPastDeadline(now);

    expect(result).toEqual([expiredSlot]);
    expect(prisma.appointments.updateManyAndReturn).toHaveBeenCalledWith({
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
  });
});
