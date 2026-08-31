import { UpdateHolidayUseCase } from './update-holiday.use-case.js';
import { AVAILABILITY_RESTRICTION_CHANGED_EVENT } from '../../../../shared/events/availability-events.interface.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import type { HolidayEntity } from '../../domain/entities/holiday.entity.js';

describe('UpdateHolidayUseCase', () => {
  let useCase: UpdateHolidayUseCase;
  let holidayRepository: jest.Mocked<
    Pick<
      IHolidayRepository,
      | 'findById'
      | 'update'
      | 'findDistinctYears'
      | 'createManyAndReturn'
      | 'deleteByNameAndYear'
    >
  >;
  let eventEmitter: { emit: jest.Mock };

  const buildHoliday = (
    overrides: Partial<HolidayEntity> = {},
  ): HolidayEntity => ({
    id: 1,
    name: 'Día de prueba',
    date: new Date('2030-06-01T12:00:00.000Z'),
    year: 2030,
    isRecurring: false,
    isActive: true,
    clinicId: 7,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    holidayRepository = {
      findById: jest.fn().mockResolvedValue(buildHoliday()),
      update: jest
        .fn()
        .mockResolvedValue(
          buildHoliday({ date: new Date('2030-06-03T12:00:00.000Z') }),
        ),
      findDistinctYears: jest.fn().mockResolvedValue([2030]),
      createManyAndReturn: jest.fn().mockResolvedValue([]),
      deleteByNameAndYear: jest.fn().mockResolvedValue(0),
    };
    eventEmitter = { emit: jest.fn() };
    useCase = new UpdateHolidayUseCase(
      holidayRepository as any,
      eventEmitter as any,
    );
  });

  it('publica el rango anterior y el nuevo cuando mueve el feriado', async () => {
    await useCase.execute(1, { date: '2030-06-03' }, 42, 7);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_CHANGED_EVENT,
      expect.objectContaining({
        restrictionType: 'HOLIDAY',
        restrictionId: 1,
        clinicId: 7,
        doctorId: null,
        previousRange: {
          startDate: new Date('2030-06-01T12:00:00.000Z'),
          endDate: new Date('2030-06-01T12:00:00.000Z'),
        },
        currentRange: {
          startDate: new Date('2030-06-03T12:00:00.000Z'),
          endDate: new Date('2030-06-03T12:00:00.000Z'),
        },
        actorId: 42,
      }),
    );
  });

  it('publica cada fecha nueva cuando al activar recurrencia crea copias', async () => {
    holidayRepository.update.mockResolvedValue(
      buildHoliday({ isRecurring: true }),
    );
    holidayRepository.findDistinctYears.mockResolvedValue([2030, 2031, 2032]);
    holidayRepository.createManyAndReturn.mockResolvedValue([
      buildHoliday({ id: 2, date: new Date('2031-06-01T12:00:00.000Z') }),
      buildHoliday({ id: 3, date: new Date('2032-06-01T12:00:00.000Z') }),
    ]);

    await useCase.execute(1, { isRecurring: true }, 42, 7);

    expect(holidayRepository.createManyAndReturn).toHaveBeenCalledWith([
      expect.objectContaining({
        date: new Date('2031-06-01T12:00:00.000Z'),
        year: 2031,
      }),
      expect.objectContaining({
        date: new Date('2032-06-01T12:00:00.000Z'),
        year: 2032,
      }),
    ]);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_CHANGED_EVENT,
      expect.objectContaining({
        restrictionId: 2,
        previousRange: null,
        currentRange: {
          startDate: new Date('2031-06-01T12:00:00.000Z'),
          endDate: new Date('2031-06-01T12:00:00.000Z'),
        },
        actorId: 42,
      }),
    );
  });
});
