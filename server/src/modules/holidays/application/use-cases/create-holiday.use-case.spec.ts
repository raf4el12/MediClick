import { ForbiddenException } from '@nestjs/common';
import { CreateHolidayUseCase } from './create-holiday.use-case.js';
import { HOLIDAY_CREATED_EVENT } from '../../../../shared/events/availability-events.interface.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import type { HolidayEntity } from '../../domain/entities/holiday.entity.js';

describe('CreateHolidayUseCase', () => {
  let useCase: CreateHolidayUseCase;
  let holidayRepository: jest.Mocked<
    Pick<IHolidayRepository, 'create' | 'createMany' | 'findDistinctYears'>
  >;
  let eventEmitter: { emit: jest.Mock };

  const buildHoliday = (
    overrides: Partial<HolidayEntity> = {},
  ): HolidayEntity => ({
    id: 1,
    name: 'Fiestas Patrias',
    date: new Date('2026-07-28T12:00:00.000Z'),
    year: 2026,
    isRecurring: false,
    isActive: true,
    clinicId: null,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });

  const dto = { name: 'Fiestas Patrias', date: '2026-07-28' };

  beforeEach(() => {
    holidayRepository = {
      create: jest.fn().mockResolvedValue(buildHoliday()),
      createMany: jest.fn().mockResolvedValue(2),
      findDistinctYears: jest.fn().mockResolvedValue([2026]),
    };
    eventEmitter = { emit: jest.fn() };

    useCase = new CreateHolidayUseCase(
      holidayRepository as any,
      eventEmitter as any,
    );
  });

  it('crea el feriado y emite holiday.created con la fecha y la sede', async () => {
    const result = await useCase.execute(dto, 7);

    expect(result.id).toBe(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      HOLIDAY_CREATED_EVENT,
      expect.objectContaining({
        date: new Date('2026-07-28T12:00:00.000Z'),
        clinicId: 7,
        name: 'Fiestas Patrias',
      }),
    );
  });

  it('feriado global (sin sede): emite el evento con clinicId null', async () => {
    await useCase.execute(dto);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      HOLIDAY_CREATED_EVENT,
      expect.objectContaining({ clinicId: null }),
    );
  });

  it('recurrente: emite un evento por cada año sembrado, no solo el del DTO', async () => {
    holidayRepository.findDistinctYears.mockResolvedValue([2026, 2027, 2028]);

    await useCase.execute({ ...dto, isRecurring: true });

    expect(holidayRepository.createMany).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      HOLIDAY_CREATED_EVENT,
      expect.objectContaining({ date: new Date('2027-07-28T12:00:00.000Z') }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      HOLIDAY_CREATED_EVENT,
      expect.objectContaining({ date: new Date('2028-07-28T12:00:00.000Z') }),
    );
  });

  it('recurrente sin otros años sembrados: emite solo el evento del año del DTO', async () => {
    holidayRepository.findDistinctYears.mockResolvedValue([2026]);

    await useCase.execute({ ...dto, isRecurring: true });

    expect(holidayRepository.createMany).not.toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
  });

  it('staff no puede crear feriados para otra sede', async () => {
    await expect(useCase.execute({ ...dto, clinicId: 9 }, 7)).rejects.toThrow(
      ForbiddenException,
    );
    expect(holidayRepository.create).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
