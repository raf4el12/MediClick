import { CreateScheduleBlockUseCase } from './create-schedule-block.use-case.js';
import { ScheduleBlockType } from '../dto/create-schedule-block.dto.js';
import { AVAILABILITY_RESTRICTION_CHANGED_EVENT } from '../../../../shared/events/availability-events.interface.js';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { ScheduleBlockWithDoctor } from '../../domain/interfaces/schedule-block-data.interface.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';

describe('CreateScheduleBlockUseCase', () => {
  let useCase: CreateScheduleBlockUseCase;
  let scheduleBlockRepository: jest.Mocked<
    Pick<IScheduleBlockRepository, 'create'>
  >;
  let doctorRepository: jest.Mocked<Pick<IDoctorRepository, 'findById'>>;
  let scheduleRegenerationService: jest.Mocked<
    Pick<ScheduleRegenerationService, 'regenerateForDoctor'>
  >;
  let eventEmitter: { emit: jest.Mock };

  const block: ScheduleBlockWithDoctor = {
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
  };

  beforeEach(() => {
    scheduleBlockRepository = { create: jest.fn().mockResolvedValue(block) };
    doctorRepository = {
      findById: jest.fn().mockResolvedValue({ id: 3, clinicId: 7 }),
    };
    scheduleRegenerationService = {
      regenerateForDoctor: jest
        .fn()
        .mockResolvedValue({ deleted: 0, generated: 0 }),
    };
    eventEmitter = { emit: jest.fn() };
    useCase = new CreateScheduleBlockUseCase(
      scheduleBlockRepository as any,
      doctorRepository as any,
      scheduleRegenerationService as any,
      eventEmitter as any,
    );
  });

  it('publica la restricción creada con médico, sede, rango y actor', async () => {
    await useCase.execute(
      {
        doctorId: 3,
        type: ScheduleBlockType.FULL_DAY,
        startDate: '2030-06-01',
        endDate: '2030-06-03',
        reason: 'Vacaciones',
      },
      42,
      7,
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_CHANGED_EVENT,
      expect.objectContaining({
        restrictionType: 'SCHEDULE_BLOCK',
        restrictionId: 1,
        clinicId: 7,
        doctorId: 3,
        previousRange: null,
        currentRange: {
          startDate: new Date('2030-06-01T00:00:00.000Z'),
          endDate: new Date('2030-06-03T00:00:00.000Z'),
        },
        actorId: 42,
      }),
    );
  });
});
