import { GenerateSchedulesUseCase } from './generate-schedules.use-case.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';

describe('GenerateSchedulesUseCase — overwrite', () => {
  let useCase: GenerateSchedulesUseCase;
  let scheduleRepository: {
    deleteUnbookedByDoctorAndDateRange: jest.Mock;
    findExistingDates: jest.Mock;
    createMany: jest.Mock;
  };
  let availabilityRepository: { findActiveByDoctorIds: jest.Mock };
  let doctorRepository: { findById: jest.Mock };
  let specialtyRepository: { findById: jest.Mock };
  let holidayRepository: { findByDateRange: jest.Mock };
  let scheduleBlockRepository: { findActiveByDoctorAndDateRange: jest.Mock };

  const DATE = '2099-01-05';
  const DAYS = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];

  const buildRule = (specialtyId: number) => ({
    doctorId: 3,
    specialtyId,
    dayOfWeek: DAYS[new Date(`${DATE}T00:00:00.000Z`).getUTCDay()],
    isAvailable: true,
    startDate: null,
    endDate: null,
    timeFrom: new Date('1970-01-01T08:00:00.000Z'),
    timeTo: new Date('1970-01-01T09:00:00.000Z'),
    clinicId: 7,
  });

  const dto = {
    doctorId: 3,
    specialtyId: 2,
    dateFrom: DATE,
    dateTo: DATE,
    overwrite: true,
  };

  beforeEach(() => {
    scheduleRepository = {
      deleteUnbookedByDoctorAndDateRange: jest.fn().mockResolvedValue(0),
      findExistingDates: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue(2),
    };
    availabilityRepository = {
      findActiveByDoctorIds: jest.fn().mockResolvedValue([buildRule(2)]),
    };
    doctorRepository = {
      findById: jest.fn().mockResolvedValue({ id: 3, clinicId: 7 }),
    };
    specialtyRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 2, duration: 30, bufferMinutes: 0 }),
    };
    holidayRepository = { findByDateRange: jest.fn().mockResolvedValue([]) };
    scheduleBlockRepository = {
      findActiveByDoctorAndDateRange: jest.fn().mockResolvedValue([]),
    };

    useCase = new GenerateSchedulesUseCase(
      scheduleRepository as any,
      availabilityRepository as any,
      doctorRepository as any,
      specialtyRepository as any,
      holidayRepository as any,
      scheduleBlockRepository as any,
    );
  });

  it('overwrite con specialtyId: borra solo los schedules de esa especialidad', async () => {
    await useCase.execute(dto);

    expect(
      scheduleRepository.deleteUnbookedByDoctorAndDateRange,
    ).toHaveBeenCalledWith(3, expect.any(Date), expect.any(Date), 2);
  });

  it('overwrite sin specialtyId: borra los schedules de todas las especialidades', async () => {
    await useCase.execute({ ...dto, specialtyId: undefined });

    expect(
      scheduleRepository.deleteUnbookedByDoctorAndDateRange,
    ).toHaveBeenCalledWith(3, expect.any(Date), expect.any(Date), undefined);
  });

  it('sin overwrite: no borra schedules', async () => {
    await useCase.execute({ ...dto, overwrite: false });

    expect(
      scheduleRepository.deleteUnbookedByDoctorAndDateRange,
    ).not.toHaveBeenCalled();
  });

  it('con specialtyId solo genera slots de esa especialidad', async () => {
    availabilityRepository.findActiveByDoctorIds.mockResolvedValue([
      buildRule(2),
      buildRule(9),
    ]);

    await useCase.execute(dto);

    const created = scheduleRepository.createMany.mock.calls[0][0];
    expect(created.length).toBeGreaterThan(0);
    expect(created.every((s: any) => s.specialtyId === 2)).toBe(true);
  });
});
