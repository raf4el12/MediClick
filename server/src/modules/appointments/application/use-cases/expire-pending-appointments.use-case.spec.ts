import { ExpirePendingAppointmentsUseCase } from './expire-pending-appointments.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';

describe('ExpirePendingAppointmentsUseCase', () => {
  let useCase: ExpirePendingAppointmentsUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'expirePendingPastDeadline'>
  >;

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
    };
    useCase = new ExpirePendingAppointmentsUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
    );
  });

  it('delega expiración y eventos durables bajo una misma identidad de job', async () => {
    appointmentRepository.expirePendingPastDeadline.mockResolvedValue([
      buildExpiredSlot(1),
      buildExpiredSlot(2),
    ]);

    await useCase.execute();

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
