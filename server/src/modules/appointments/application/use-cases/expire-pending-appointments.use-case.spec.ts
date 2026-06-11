import { ExpirePendingAppointmentsUseCase } from './expire-pending-appointments.use-case.js';
import { SLOT_RELEASED_EVENT } from '../../../../shared/events/availability-events.interface.js';

describe('ExpirePendingAppointmentsUseCase', () => {
  let useCase: ExpirePendingAppointmentsUseCase;
  let appointmentRepository: { expirePendingPastDeadline: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

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
    eventEmitter = { emit: jest.fn() };

    useCase = new ExpirePendingAppointmentsUseCase(
      appointmentRepository as any,
      eventEmitter as any,
    );
  });

  it('expira las citas vencidas y emite slot_released por cada slot liberado', async () => {
    appointmentRepository.expirePendingPastDeadline.mockResolvedValue([
      buildExpiredSlot(1),
      buildExpiredSlot(2),
    ]);

    await useCase.execute();

    expect(
      appointmentRepository.expirePendingPastDeadline,
    ).toHaveBeenCalledWith(expect.any(Date));
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(SLOT_RELEASED_EVENT, {
      appointmentId: 1,
      scheduleId: 11,
      startTime: new Date('1970-01-01T09:00:00.000Z'),
      endTime: new Date('1970-01-01T09:30:00.000Z'),
      clinicId: 7,
    });
  });

  it('sin citas vencidas: no emite eventos', async () => {
    await useCase.execute();

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
