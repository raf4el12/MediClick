import { FreeSlotsService } from './free-slots.service.js';
import type { IScheduleRepository } from '../repositories/schedule.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import type { SlotWindow } from '../interfaces/schedule-data.interface.js';

describe('FreeSlotsService', () => {
  const hour = (h: number, m = 0) => new Date(Date.UTC(1970, 0, 1, h, m));
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  const buildWindow = (overrides: Partial<SlotWindow> = {}): SlotWindow => ({
    id: 10,
    doctorId: 3,
    clinicId: 7,
    scheduleDate: day('2099-01-15'),
    timeFrom: hour(8),
    timeTo: hour(10),
    durationMinutes: 60,
    bufferMinutes: 0,
    ...overrides,
  });

  let scheduleRepository: jest.Mocked<
    Pick<
      IScheduleRepository,
      'findSlotWindowsInRange' | 'findDoctorBookingsInRange'
    >
  >;
  let holidayRepository: jest.Mocked<
    Pick<IHolidayRepository, 'findActiveInRangeForClinic'>
  >;
  let scheduleBlockRepository: jest.Mocked<
    Pick<IScheduleBlockRepository, 'findActiveByDoctorAndDateRange'>
  >;
  let timezoneResolver: jest.Mocked<
    Pick<TimezoneResolverService, 'resolveByDoctorId'>
  >;
  let service: FreeSlotsService;

  const filter = {
    doctorId: 3,
    from: day('2099-01-15'),
    to: day('2099-01-16'),
  };

  beforeEach(() => {
    scheduleRepository = {
      findSlotWindowsInRange: jest.fn().mockResolvedValue([buildWindow()]),
      findDoctorBookingsInRange: jest.fn().mockResolvedValue([]),
    };
    holidayRepository = {
      findActiveInRangeForClinic: jest.fn().mockResolvedValue([]),
    };
    scheduleBlockRepository = {
      findActiveByDoctorAndDateRange: jest.fn().mockResolvedValue([]),
    };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('UTC'),
    };
    service = new FreeSlotsService(
      scheduleRepository as unknown as IScheduleRepository,
      holidayRepository as unknown as IHolidayRepository,
      scheduleBlockRepository as unknown as IScheduleBlockRepository,
      timezoneResolver as unknown as TimezoneResolverService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('devuelve los cupos libres con hora base 1970 y la sede del bloque', async () => {
    const result = await service.find(filter);

    expect(scheduleRepository.findSlotWindowsInRange).toHaveBeenCalledWith(
      filter,
    );
    expect(result).toEqual([
      { scheduleId: 10, clinicId: 7, startTime: hour(8), endTime: hour(9) },
      { scheduleId: 10, clinicId: 7, startTime: hour(9), endTime: hour(10) },
    ]);
  });

  it('excluye cupos con cita activa, bloqueo vigente y días feriados', async () => {
    scheduleRepository.findSlotWindowsInRange.mockResolvedValue([
      buildWindow({ id: 10, scheduleDate: day('2099-01-15') }),
      buildWindow({ id: 11, scheduleDate: day('2099-01-16') }),
    ]);
    scheduleRepository.findDoctorBookingsInRange.mockResolvedValue([
      { scheduleDate: day('2099-01-15'), startTime: hour(8), endTime: hour(9) },
    ]);
    scheduleBlockRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      {
        id: 1,
        doctorId: 3,
        type: 'TIME_RANGE',
        startDate: day('2099-01-15'),
        endDate: day('2099-01-15'),
        timeFrom: hour(9),
        timeTo: hour(9, 30),
        reason: 'x',
        isActive: true,
        createdAt: new Date(),
        updatedAt: null,
      },
    ]);
    holidayRepository.findActiveInRangeForClinic.mockResolvedValue([
      {
        id: 5,
        name: 'Feriado',
        date: new Date('2099-01-16T12:00:00.000Z'),
        year: 2099,
        isRecurring: false,
        isActive: true,
        clinicId: null,
        createdAt: new Date(),
        updatedAt: null,
      },
    ]);

    const result = await service.find(filter);

    expect(holidayRepository.findActiveInRangeForClinic).toHaveBeenCalledWith(
      filter.from,
      filter.to,
      7,
    );
    expect(result).toEqual([]);
  });

  it('hoy respeta la anticipación mínima en la zona de la sede y los días pasados no cuentan', async () => {
    jest.useFakeTimers({ now: new Date('2026-06-15T10:00:00.000Z') });
    scheduleRepository.findSlotWindowsInRange.mockResolvedValue([
      buildWindow({ id: 9, scheduleDate: day('2026-06-14'), timeTo: hour(16) }),
      buildWindow({
        id: 10,
        scheduleDate: day('2026-06-15'),
        timeTo: hour(16),
      }),
    ]);

    const result = await service.find({
      doctorId: 3,
      from: day('2026-06-14'),
      to: day('2026-06-15'),
    });

    expect(result.map((s) => [s.scheduleId, s.startTime])).toEqual([
      [10, hour(12)],
      [10, hour(13)],
      [10, hour(14)],
      [10, hour(15)],
    ]);
  });

  it('consulta citas, bloqueos y feriados una vez por médico', async () => {
    scheduleRepository.findSlotWindowsInRange.mockResolvedValue([
      buildWindow({ id: 10, doctorId: 3, clinicId: 7 }),
      buildWindow({ id: 20, doctorId: 4, clinicId: 8 }),
    ]);

    const result = await service.find({ from: filter.from, to: filter.to });

    expect(scheduleRepository.findDoctorBookingsInRange).toHaveBeenCalledTimes(
      2,
    );
    expect(holidayRepository.findActiveInRangeForClinic).toHaveBeenCalledWith(
      filter.from,
      filter.to,
      8,
    );
    expect(result.map((s) => s.clinicId)).toEqual([7, 7, 8, 8]);
  });
});
