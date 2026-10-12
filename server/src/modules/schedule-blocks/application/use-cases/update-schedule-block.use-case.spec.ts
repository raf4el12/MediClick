import { UpdateScheduleBlockUseCase } from './update-schedule-block.use-case.js';
import { BadRequestException } from '@nestjs/common';
import {
  AVAILABILITY_RESTRICTION_CHANGED_EVENT,
  AVAILABILITY_RESTRICTION_LIFTED_EVENT,
} from '../../../../shared/events/availability-events.interface.js';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import type { ScheduleBlockWithDoctor } from '../../domain/interfaces/schedule-block-data.interface.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';

describe('UpdateScheduleBlockUseCase', () => {
  let useCase: UpdateScheduleBlockUseCase;
  let scheduleBlockRepository: jest.Mocked<
    Pick<IScheduleBlockRepository, 'findById' | 'update'>
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
    endDate: new Date('2030-06-01T00:00:00.000Z'),
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
      update: jest
        .fn()
        .mockResolvedValue(
          buildBlock({ endDate: new Date('2030-06-03T00:00:00.000Z') }),
        ),
    };
    scheduleRegenerationService = {
      regenerateForDoctor: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = { emit: jest.fn() };
    useCase = new UpdateScheduleBlockUseCase(
      scheduleBlockRepository as any,
      scheduleRegenerationService as any,
      eventEmitter as any,
    );
  });

  it('publica el rango anterior y el nuevo después de expandir el bloqueo', async () => {
    await useCase.execute(1, { endDate: '2030-06-03' }, 42, 7);

    expect(
      scheduleRegenerationService.regenerateForDoctor,
    ).toHaveBeenCalledWith(
      3,
      new Date('2030-06-01T00:00:00.000Z'),
      new Date('2030-06-03T00:00:00.000Z'),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_CHANGED_EVENT,
      expect.objectContaining({
        restrictionType: 'SCHEDULE_BLOCK',
        restrictionId: 1,
        clinicId: 7,
        doctorId: 3,
        previousRange: {
          startDate: new Date('2030-06-01T00:00:00.000Z'),
          endDate: new Date('2030-06-01T00:00:00.000Z'),
        },
        currentRange: {
          startDate: new Date('2030-06-01T00:00:00.000Z'),
          endDate: new Date('2030-06-03T00:00:00.000Z'),
        },
        actorId: 42,
      }),
    );
  });

  it('expandir el bloqueo no libera ningún día', async () => {
    await useCase.execute(1, { endDate: '2030-06-03' }, 42, 7);

    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_LIFTED_EVENT,
      expect.anything(),
    );
  });

  it('achicar el bloqueo libera los días que el rango nuevo ya no cubre', async () => {
    scheduleBlockRepository.findById.mockResolvedValue(
      buildBlock({ endDate: new Date('2030-06-05T00:00:00.000Z') }),
    );
    scheduleBlockRepository.update.mockResolvedValue(
      buildBlock({ endDate: new Date('2030-06-02T00:00:00.000Z') }),
    );

    await useCase.execute(1, { endDate: '2030-06-02' }, 42, 7);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_LIFTED_EVENT,
      expect.objectContaining({
        restrictionType: 'SCHEDULE_BLOCK',
        restrictionId: 1,
        clinicId: 7,
        doctorId: 3,
        liftedRanges: [
          {
            startDate: new Date('2030-06-03T00:00:00.000Z'),
            endDate: new Date('2030-06-05T00:00:00.000Z'),
          },
        ],
        actorId: 42,
      }),
    );
  });

  it('desactivar el bloqueo libera todo su rango', async () => {
    scheduleBlockRepository.update.mockResolvedValue(
      buildBlock({ isActive: false }),
    );

    await useCase.execute(1, { isActive: false }, 42, 7);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_LIFTED_EVENT,
      expect.objectContaining({
        liftedRanges: [
          {
            startDate: new Date('2030-06-01T00:00:00.000Z'),
            endDate: new Date('2030-06-01T00:00:00.000Z'),
          },
        ],
      }),
    );
  });

  it('cambiar las horas de un bloqueo por rango horario reevalúa sus días', async () => {
    const hour = (h: number) => new Date(Date.UTC(1970, 0, 1, h));
    scheduleBlockRepository.findById.mockResolvedValue(
      buildBlock({ type: 'TIME_RANGE', timeFrom: hour(8), timeTo: hour(12) }),
    );
    scheduleBlockRepository.update.mockResolvedValue(
      buildBlock({ type: 'TIME_RANGE', timeFrom: hour(8), timeTo: hour(10) }),
    );

    await useCase.execute(1, { timeTo: '10:00' }, 42, 7);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_LIFTED_EVENT,
      expect.objectContaining({
        liftedRanges: [
          {
            startDate: new Date('2030-06-01T00:00:00.000Z'),
            endDate: new Date('2030-06-01T00:00:00.000Z'),
          },
        ],
      }),
    );
  });

  it('rechaza un rango final cuyo inicio queda después del fin', async () => {
    await expect(
      useCase.execute(1, { startDate: '2030-06-03' }, 42, 7),
    ).rejects.toThrow(BadRequestException);

    expect(scheduleBlockRepository.update).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
