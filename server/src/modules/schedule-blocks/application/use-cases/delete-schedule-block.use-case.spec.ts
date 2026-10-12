import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteScheduleBlockUseCase } from './delete-schedule-block.use-case.js';
import { AVAILABILITY_RESTRICTION_LIFTED_EVENT } from '../../../../shared/events/availability-events.interface.js';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import type { ScheduleBlockWithDoctor } from '../../domain/interfaces/schedule-block-data.interface.js';
import type { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';

describe('DeleteScheduleBlockUseCase', () => {
  let useCase: DeleteScheduleBlockUseCase;
  let scheduleBlockRepository: jest.Mocked<
    Pick<IScheduleBlockRepository, 'findById' | 'softDelete'>
  >;
  let scheduleRegenerationService: jest.Mocked<
    Pick<ScheduleRegenerationService, 'regenerateForDoctor'>
  >;
  let eventEmitter: { emit: jest.Mock };

  const buildBlock = (
    overrides: Partial<ScheduleBlockWithDoctor> = {},
  ): ScheduleBlockWithDoctor => ({
    id: 1,
    doctorId: 3,
    type: 'FULL_DAY',
    startDate: new Date('2030-06-01T00:00:00.000Z'),
    endDate: new Date('2030-06-03T00:00:00.000Z'),
    timeFrom: null,
    timeTo: null,
    reason: 'Vacaciones',
    isActive: true,
    createdAt: new Date(),
    updatedAt: null,
    doctor: {
      id: 3,
      clinicId: 7,
      profile: { name: 'Ana', lastName: 'Médica' },
    },
    ...overrides,
  });

  beforeEach(() => {
    scheduleBlockRepository = {
      findById: jest.fn().mockResolvedValue(buildBlock()),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    scheduleRegenerationService = {
      regenerateForDoctor: jest
        .fn()
        .mockResolvedValue({ deleted: 0, generated: 0 }),
    };
    eventEmitter = { emit: jest.fn() };
    useCase = new DeleteScheduleBlockUseCase(
      scheduleBlockRepository as unknown as IScheduleBlockRepository,
      scheduleRegenerationService as unknown as ScheduleRegenerationService,
      eventEmitter as never,
    );
  });

  it('borra, regenera la agenda y publica el rango completo como liberado', async () => {
    await useCase.execute(1, 7, 42);

    expect(scheduleBlockRepository.softDelete).toHaveBeenCalledWith(1);
    expect(
      scheduleRegenerationService.regenerateForDoctor,
    ).toHaveBeenCalledWith(
      3,
      new Date('2030-06-01T00:00:00.000Z'),
      new Date('2030-06-03T00:00:00.000Z'),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_LIFTED_EVENT,
      expect.objectContaining({
        restrictionType: 'SCHEDULE_BLOCK',
        restrictionId: 1,
        clinicId: 7,
        doctorId: 3,
        liftedRanges: [
          {
            startDate: new Date('2030-06-01T00:00:00.000Z'),
            endDate: new Date('2030-06-03T00:00:00.000Z'),
          },
        ],
        actorId: 42,
      }),
    );
    const emitOrder = eventEmitter.emit.mock.invocationCallOrder[0];
    const regenOrder =
      scheduleRegenerationService.regenerateForDoctor.mock
        .invocationCallOrder[0];
    expect(regenOrder).toBeLessThan(emitOrder);
  });

  it('un bloqueo ya inactivo se borra sin reofrecer nada', async () => {
    scheduleBlockRepository.findById.mockResolvedValue(
      buildBlock({ isActive: false }),
    );

    await useCase.execute(1, 7, 42);

    expect(scheduleBlockRepository.softDelete).toHaveBeenCalledWith(1);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('rechaza bloqueos inexistentes o de otra sede sin tocar nada', async () => {
    await expect(useCase.execute(1, 9, 42)).rejects.toThrow(ForbiddenException);
    scheduleBlockRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute(1, 7, 42)).rejects.toThrow(NotFoundException);

    expect(scheduleBlockRepository.softDelete).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
