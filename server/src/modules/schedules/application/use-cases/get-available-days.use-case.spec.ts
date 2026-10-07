import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GetAvailableDaysUseCase } from './get-available-days.use-case.js';
import { GetAvailableTimeSlotsUseCase } from './get-available-time-slots.use-case.js';
import type { ScheduleWindow } from '../../domain/interfaces/schedule-data.interface.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';

describe('GetAvailableDaysUseCase', () => {
  const hour = (h: number, m = 0) => new Date(Date.UTC(1970, 0, 1, h, m));
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  const buildSchedule = (
    overrides: Partial<ScheduleWindow> = {},
  ): ScheduleWindow => ({
    id: 10,
    scheduleDate: day('2099-01-15'),
    timeFrom: hour(8),
    timeTo: hour(10),
    ...overrides,
  });

  let scheduleRepository: {
    findByDoctorRange: jest.Mock;
    findDoctorBookingsInRange: jest.Mock;
  };
  let specialtyRepository: { findById: jest.Mock };
  let holidayRepository: { findActiveInRangeForClinic: jest.Mock };
  let scheduleBlockRepository: { findActiveByDoctorAndDateRange: jest.Mock };
  let timezoneResolver: {
    resolveByDoctorId: jest.Mock;
    resolveClinicIdByDoctorId: jest.Mock;
  };
  let useCase: GetAvailableDaysUseCase;

  const dto = {
    doctorId: 3,
    specialtyId: 1,
    dateFrom: '2099-01-01',
    dateTo: '2099-01-31',
  };

  beforeEach(() => {
    scheduleRepository = {
      findByDoctorRange: jest.fn().mockResolvedValue([buildSchedule()]),
      findDoctorBookingsInRange: jest.fn().mockResolvedValue([]),
    };
    specialtyRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 1, duration: 20, bufferMinutes: 0 }),
    };
    holidayRepository = {
      findActiveInRangeForClinic: jest.fn().mockResolvedValue([]),
    };
    scheduleBlockRepository = {
      findActiveByDoctorAndDateRange: jest.fn().mockResolvedValue([]),
    };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('UTC'),
      resolveClinicIdByDoctorId: jest.fn().mockResolvedValue(7),
    };

    useCase = new GetAvailableDaysUseCase(
      scheduleRepository as unknown as IScheduleRepository,
      specialtyRepository as unknown as ISpecialtyRepository,
      holidayRepository as unknown as IHolidayRepository,
      scheduleBlockRepository as unknown as IScheduleBlockRepository,
      timezoneResolver as unknown as TimezoneResolverService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cuenta los cupos libres de cada día con agenda', async () => {
    const result = await useCase.execute(dto, null);

    expect(result).toEqual({
      doctorId: 3,
      specialtyId: 1,
      timezone: 'UTC',
      days: [{ date: '2099-01-15', availableCount: 6 }],
    });
  });
  it('un día con todos los cupos ocupados no aparece', async () => {
    scheduleRepository.findDoctorBookingsInRange.mockResolvedValue([
      {
        scheduleDate: day('2099-01-15'),
        startTime: hour(8),
        endTime: hour(10),
      },
    ]);

    const result = await useCase.execute(dto, null);

    expect(result.days).toEqual([]);
  });

  it('una cita activa de otra especialidad del mismo médico descuenta el cupo solapado', async () => {
    scheduleRepository.findDoctorBookingsInRange.mockResolvedValue([
      {
        scheduleDate: day('2099-01-15'),
        startTime: hour(8),
        endTime: hour(8, 20),
      },
    ]);

    const result = await useCase.execute(dto, null);

    expect(result.days).toEqual([{ date: '2099-01-15', availableCount: 5 }]);
  });

  it('un feriado global o de la sede del médico excluye el día', async () => {
    scheduleRepository.findByDoctorRange.mockResolvedValue([
      buildSchedule({ id: 10, scheduleDate: day('2099-01-15') }),
      buildSchedule({ id: 11, scheduleDate: day('2099-01-16') }),
      buildSchedule({ id: 12, scheduleDate: day('2099-01-17') }),
    ]);
    holidayRepository.findActiveInRangeForClinic.mockResolvedValue([
      { id: 1, date: day('2099-01-15'), clinicId: null },
      { id: 2, date: day('2099-01-16'), clinicId: 7 },
    ]);

    const result = await useCase.execute(dto, null);

    expect(holidayRepository.findActiveInRangeForClinic).toHaveBeenCalledWith(
      day('2099-01-01'),
      day('2099-01-31'),
      7,
    );
    expect(result.days.map((d) => d.date)).toEqual(['2099-01-17']);
  });
  it('un bloqueo de día completo excluye el día y uno por rango horario solo descuenta los cupos solapados', async () => {
    scheduleRepository.findByDoctorRange.mockResolvedValue([
      buildSchedule({ id: 10, scheduleDate: day('2099-01-15') }),
      buildSchedule({ id: 11, scheduleDate: day('2099-01-16') }),
    ]);
    scheduleBlockRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      {
        id: 1,
        doctorId: 3,
        type: 'FULL_DAY',
        startDate: day('2099-01-15'),
        endDate: day('2099-01-15'),
        timeFrom: null,
        timeTo: null,
      },
      {
        id: 2,
        doctorId: 3,
        type: 'TIME_RANGE',
        startDate: day('2099-01-16'),
        endDate: day('2099-01-16'),
        timeFrom: hour(9),
        timeTo: hour(10),
      },
    ]);

    const result = await useCase.execute(dto, null);

    expect(result.days).toEqual([{ date: '2099-01-16', availableCount: 3 }]);
  });
  it('hoy, en la zona de la sede, no cuenta los cupos dentro de las próximas 2 horas y los días pasados no aparecen', async () => {
    jest.useFakeTimers({ now: new Date('2026-06-15T10:00:00.000Z') });
    specialtyRepository.findById.mockResolvedValue({
      id: 1,
      duration: 120,
      bufferMinutes: 0,
    });
    scheduleRepository.findByDoctorRange.mockResolvedValue([
      buildSchedule({
        id: 9,
        scheduleDate: day('2026-06-14'),
        timeFrom: hour(8),
        timeTo: hour(16),
      }),
      buildSchedule({
        id: 10,
        scheduleDate: day('2026-06-15'),
        timeFrom: hour(8),
        timeTo: hour(16),
      }),
      buildSchedule({
        id: 11,
        scheduleDate: day('2026-06-16'),
        timeFrom: hour(8),
        timeTo: hour(16),
      }),
    ]);

    const result = await useCase.execute(
      { ...dto, dateFrom: '2026-06-14', dateTo: '2026-06-16' },
      null,
    );

    expect(result.days).toEqual([
      { date: '2026-06-15', availableCount: 2 },
      { date: '2026-06-16', availableCount: 4 },
    ]);
  });
  it('rechaza un rango invertido o de más de 62 días', async () => {
    await expect(
      useCase.execute(
        { ...dto, dateFrom: '2099-01-10', dateTo: '2099-01-09' },
        null,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute(
        { ...dto, dateFrom: '2099-01-01', dateTo: '2099-03-04' },
        null,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(scheduleRepository.findByDoctorRange).not.toHaveBeenCalled();
  });

  it('rechaza una fecha con formato válido que no existe en el calendario', async () => {
    await expect(
      useCase.execute(
        { ...dto, dateFrom: '2099-02-30', dateTo: '2099-03-05' },
        null,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza una especialidad inexistente o sin duración', async () => {
    specialtyRepository.findById.mockResolvedValueOnce(null);
    await expect(useCase.execute(dto, null)).rejects.toThrow(NotFoundException);

    specialtyRepository.findById.mockResolvedValueOnce({ id: 1, duration: 0 });
    await expect(useCase.execute(dto, null)).rejects.toThrow(
      BadRequestException,
    );
  });
  it('el personal de otra sede recibe 404; un actor sin sede (paciente multi-sede) puede consultar', async () => {
    await expect(useCase.execute(dto, 1)).rejects.toThrow(NotFoundException);
    expect(scheduleRepository.findByDoctorRange).not.toHaveBeenCalled();

    await expect(useCase.execute(dto, 7)).resolves.toMatchObject({
      doctorId: 3,
    });
    await expect(useCase.execute(dto, null)).resolves.toMatchObject({
      doctorId: 3,
    });
  });
  it('cuenta los mismos cupos libres que time-slots para ese día', async () => {
    specialtyRepository.findById.mockResolvedValue({
      id: 1,
      duration: 15,
      bufferMinutes: 5,
    });
    scheduleRepository.findByDoctorRange.mockResolvedValue([
      buildSchedule({ id: 10, timeFrom: hour(8), timeTo: hour(12) }),
    ]);
    scheduleRepository.findDoctorBookingsInRange.mockResolvedValue([
      {
        scheduleDate: day('2099-01-15'),
        startTime: hour(8, 20),
        endTime: hour(8, 50),
      },
    ]);
    scheduleBlockRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      {
        id: 2,
        doctorId: 3,
        type: 'TIME_RANGE',
        startDate: day('2099-01-15'),
        endDate: day('2099-01-15'),
        timeFrom: hour(10),
        timeTo: hour(11),
      },
    ]);
    const timeSlots = new GetAvailableTimeSlotsUseCase(
      scheduleRepository as unknown as IScheduleRepository,
      specialtyRepository as unknown as ISpecialtyRepository,
      {
        isHoliday: jest.fn().mockResolvedValue(false),
      } as unknown as IHolidayRepository,
      scheduleBlockRepository as unknown as IScheduleBlockRepository,
      timezoneResolver as unknown as TimezoneResolverService,
    );

    const [days, slots] = await Promise.all([
      useCase.execute(dto, null),
      timeSlots.execute({ doctorId: 3, specialtyId: 1, date: '2099-01-15' }),
    ]);

    expect(days.days).toEqual([
      {
        date: '2099-01-15',
        availableCount: slots.filter((slot) => slot.available).length,
      },
    ]);
    expect(days.days[0].availableCount).toBe(7);
  });
});
