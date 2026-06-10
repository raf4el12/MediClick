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

  it('expires both PENDING and FAILED payment statuses (slot zombi por pago rechazado)', async () => {
    prisma.appointments.updateMany.mockResolvedValue({ count: 1 });

    await useCase.execute();

    const { where } = prisma.appointments.updateMany.mock.calls[0][0];
    expect(where.paymentStatus).toEqual({ in: ['PENDING', 'FAILED'] });
  });

  it('is a no-op when there are no expired appointments', async () => {
    prisma.appointments.updateMany.mockResolvedValue({ count: 0 });

    await expect(useCase.execute()).resolves.toBeUndefined();
  });
});
