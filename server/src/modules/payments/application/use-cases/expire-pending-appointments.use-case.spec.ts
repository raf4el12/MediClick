import { ExpirePendingAppointmentsUseCase } from './expire-pending-appointments.use-case.js';

describe('ExpirePendingAppointmentsUseCase', () => {
  let useCase: ExpirePendingAppointmentsUseCase;
  let prisma: { appointments: { updateMany: jest.Mock } };

  beforeEach(() => {
    prisma = { appointments: { updateMany: jest.fn() } };
    useCase = new ExpirePendingAppointmentsUseCase(prisma as any);
  });

  it('cancels appointments whose pendingUntil has elapsed', async () => {
    prisma.appointments.updateMany.mockResolvedValue({ count: 3 });

    await useCase.execute();

    expect(prisma.appointments.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          paymentStatus: 'PENDING',
          deleted: false,
          pendingUntil: expect.objectContaining({ lt: expect.any(Date) }),
        }),
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancelReason: expect.stringContaining('Pago no completado'),
        }),
      }),
    );
  });

  it('is a no-op when there are no expired appointments', async () => {
    prisma.appointments.updateMany.mockResolvedValue({ count: 0 });

    await expect(useCase.execute()).resolves.toBeUndefined();
  });
});
