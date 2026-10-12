import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteHolidayUseCase } from './delete-holiday.use-case.js';
import { AVAILABILITY_RESTRICTION_LIFTED_EVENT } from '../../../../shared/events/availability-events.interface.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import type { HolidayEntity } from '../../domain/entities/holiday.entity.js';

describe('DeleteHolidayUseCase', () => {
  let useCase: DeleteHolidayUseCase;
  let holidayRepository: jest.Mocked<
    Pick<IHolidayRepository, 'findById' | 'delete'>
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
      delete: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = { emit: jest.fn() };
    useCase = new DeleteHolidayUseCase(
      holidayRepository as unknown as IHolidayRepository,
      eventEmitter as never,
    );
  });

  it('borra y publica el día del feriado como liberado para la sede', async () => {
    await useCase.execute(1, 7, 42);

    expect(holidayRepository.delete).toHaveBeenCalledWith(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_LIFTED_EVENT,
      expect.objectContaining({
        restrictionType: 'HOLIDAY',
        restrictionId: 1,
        clinicId: 7,
        doctorId: null,
        liftedRanges: [
          {
            startDate: new Date('2030-06-01T00:00:00.000Z'),
            endDate: new Date('2030-06-01T00:00:00.000Z'),
          },
        ],
        actorId: 42,
      }),
    );
  });

  it('un feriado global borrado por un actor global libera el día en todas las sedes', async () => {
    holidayRepository.findById.mockResolvedValue(
      buildHoliday({ clinicId: null }),
    );

    await useCase.execute(1, null, 42);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      AVAILABILITY_RESTRICTION_LIFTED_EVENT,
      expect.objectContaining({ clinicId: null }),
    );
  });

  it('un feriado ya inactivo se borra sin reofrecer nada', async () => {
    holidayRepository.findById.mockResolvedValue(
      buildHoliday({ isActive: false }),
    );

    await useCase.execute(1, 7, 42);

    expect(holidayRepository.delete).toHaveBeenCalledWith(1);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('rechaza feriados inexistentes o fuera de la sede del actor sin tocar nada', async () => {
    await expect(useCase.execute(1, 9, 42)).rejects.toThrow(ForbiddenException);
    holidayRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute(1, 7, 42)).rejects.toThrow(NotFoundException);

    expect(holidayRepository.delete).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
