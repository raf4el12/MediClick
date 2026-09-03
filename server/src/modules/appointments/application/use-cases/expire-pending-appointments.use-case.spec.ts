import { ExpirePendingAppointmentsUseCase } from './expire-pending-appointments.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';

describe('ExpirePendingAppointmentsUseCase', () => {
  let useCase: ExpirePendingAppointmentsUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'expirePendingPastDeadline'>
  >;
  let jobLeaseService: jest.Mocked<Pick<JobLeaseService, 'withLease'>>;

  const buildExpiredSlot = (id: number) => ({
    id,
    scheduleId: 10 + id,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T09:30:00.000Z'),
    clinicId: 7,
  });

  beforeEach(() => {
    appointmentRepository = {
      expirePendingPastDeadline: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<
      Pick<IAppointmentRepository, 'expirePendingPastDeadline'>
    >;

    jobLeaseService = {
      withLease: jest.fn().mockImplementation(async (_name, _ttl, fn) => {
        const res = await fn();
        return { executed: true, result: res };
      }),
    } as unknown as jest.Mocked<Pick<JobLeaseService, 'withLease'>>;

    useCase = new ExpirePendingAppointmentsUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      jobLeaseService as unknown as JobLeaseService,
    );
  });

  it('delega expiración y eventos durables bajo una misma identidad de job dentro de un lease', async () => {
    appointmentRepository.expirePendingPastDeadline.mockResolvedValue([
      buildExpiredSlot(1),
      buildExpiredSlot(2),
    ]);

    await useCase.execute();

    expect(jobLeaseService.withLease).toHaveBeenCalledWith(
      'expire-pending-appointments',
      55,
      expect.any(Function) as unknown as () => Promise<void>,
    );

    const [now, identity] =
      appointmentRepository.expirePendingPastDeadline.mock.calls[0];
    expect(now).toBeInstanceOf(Date);
    expect(typeof identity.operationId).toBe('string');
    expect(identity.occurredAt).toBe(now);
  });

  it('sin citas vencidas: finaliza sin efectos posteriores', async () => {
    await useCase.execute();

    expect(
      appointmentRepository.expirePendingPastDeadline,
    ).toHaveBeenCalledTimes(1);
  });
});
