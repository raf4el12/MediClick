import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GetAvailableTimeSlotsUseCase } from './get-available-time-slots.use-case.js';
import type { ScheduleWithBookedSlots } from '../../domain/interfaces/schedule-data.interface.js';
import type { ScheduleBlockEntity } from '../../../schedule-blocks/domain/entities/schedule-block.entity.js';

describe('GetAvailableTimeSlotsUseCase', () => {
  let useCase: GetAvailableTimeSlotsUseCase;
  let scheduleRepository: { findByDoctorDateWithBookedSlots: jest.Mock };
  let specialtyRepository: { findById: jest.Mock };
  let holidayRepository: { isHoliday: jest.Mock };
  let scheduleBlockRepository: { findActiveByDoctorAndDateRange: jest.Mock };
  let timezoneResolver: {
    resolveByDoctorId: jest.Mock;
    resolveClinicIdByDoctorId: jest.Mock;
  };

  const FUTURE_DATE = '2099-01-15';
  const hour = (h: number, m = 0) => new Date(Date.UTC(1970, 0, 1, h, m));

  const buildSchedule = (
    overrides: Partial<ScheduleWithBookedSlots> = {},
  ): ScheduleWithBookedSlots => ({
    id: 10,
    doctorId: 3,
    specialtyId: 1,
    scheduleDate: new Date(`${FUTURE_DATE}T00:00:00.000Z`),
    timeFrom: hour(8),
    timeTo: hour(10),
    bookedSlots: [],
    ...overrides,
  });

  const buildBlock = (
    overrides: Partial<ScheduleBlockEntity> = {},
  ): ScheduleBlockEntity => ({
    id: 1,
    doctorId: 3,
    type: 'TIME_RANGE',
    startDate: new Date(`${FUTURE_DATE}T00:00:00.000Z`),
    endDate: new Date(`${FUTURE_DATE}T00:00:00.000Z`),
    timeFrom: hour(9),
    timeTo: hour(10),
    reason: 'Congreso',
    isActive: true,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });

  const dto = { doctorId: 3, specialtyId: 1, date: FUTURE_DATE };

  beforeEach(() => {
    scheduleRepository = {
      findByDoctorDateWithBookedSlots: jest
        .fn()
        .mockResolvedValue([buildSchedule()]),
    };
    specialtyRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 1, duration: 60, bufferMinutes: 0 }),
    };
    holidayRepository = { isHoliday: jest.fn().mockResolvedValue(false) };
    scheduleBlockRepository = {
      findActiveByDoctorAndDateRange: jest.fn().mockResolvedValue([]),
    };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('UTC'),
      resolveClinicIdByDoctorId: jest.fn().mockResolvedValue(7),
    };

    useCase = new GetAvailableTimeSlotsUseCase(
      scheduleRepository as any,
      specialtyRepository as any,
      holidayRepository as any,
      scheduleBlockRepository as any,
      timezoneResolver as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lanza NotFound si la especialidad no existe', async () => {
    specialtyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequest si la especialidad no tiene duración', async () => {
    specialtyRepository.findById.mockResolvedValue({ id: 1, duration: 0 });

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it('genera slots disponibles y marca ocupados los que cruzan con citas', async () => {
    scheduleRepository.findByDoctorDateWithBookedSlots.mockResolvedValue([
      buildSchedule({
        bookedSlots: [{ startTime: hour(8), endTime: hour(9) }],
      }),
    ]);

    const result = await useCase.execute(dto);

    expect(result).toEqual([
      { scheduleId: 10, startTime: '08:00', endTime: '09:00', available: false },
      { scheduleId: 10, startTime: '09:00', endTime: '10:00', available: true },
    ]);
  });

  it('fecha pasada: retorna vacío sin consultar horarios', async () => {
    const result = await useCase.execute({ ...dto, date: '2020-01-01' });

    expect(result).toEqual([]);
    expect(
      scheduleRepository.findByDoctorDateWithBookedSlots,
    ).not.toHaveBeenCalled();
  });

  it('feriado (de la sede del doctor): retorna vacío sin consultar horarios', async () => {
    holidayRepository.isHoliday.mockResolvedValue(true);

    const result = await useCase.execute(dto);

    expect(result).toEqual([]);
    expect(holidayRepository.isHoliday).toHaveBeenCalledWith(
      new Date(`${FUTURE_DATE}T00:00:00.000Z`),
      7,
    );
    expect(
      scheduleRepository.findByDoctorDateWithBookedSlots,
    ).not.toHaveBeenCalled();
  });

  it('sin horarios para la fecha: retorna vacío', async () => {
    scheduleRepository.findByDoctorDateWithBookedSlots.mockResolvedValue([]);

    const result = await useCase.execute(dto);

    expect(result).toEqual([]);
  });

  it('bloqueo TIME_RANGE: marca no disponibles los slots que cruzan con el rango', async () => {
    scheduleBlockRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      buildBlock({ timeFrom: hour(9), timeTo: hour(10) }),
    ]);

    const result = await useCase.execute(dto);

    expect(result.map((s) => s.available)).toEqual([true, false]);
    expect(
      scheduleBlockRepository.findActiveByDoctorAndDateRange,
    ).toHaveBeenCalledWith(
      3,
      new Date(`${FUTURE_DATE}T00:00:00.000Z`),
      new Date(`${FUTURE_DATE}T00:00:00.000Z`),
    );
  });

  it('bloqueo FULL_DAY: marca no disponibles todos los slots del día', async () => {
    scheduleBlockRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      buildBlock({ type: 'FULL_DAY', timeFrom: null, timeTo: null }),
    ]);

    const result = await useCase.execute(dto);

    expect(result).toHaveLength(2);
    expect(result.every((s) => !s.available)).toBe(true);
  });

  it('hoy: los slots dentro de las próximas 2 horas no están disponibles', async () => {
    jest.useFakeTimers({ now: new Date('2026-06-15T10:00:00.000Z') });
    scheduleRepository.findByDoctorDateWithBookedSlots.mockResolvedValue([
      buildSchedule({
        scheduleDate: new Date('2026-06-15T00:00:00.000Z'),
        timeFrom: hour(8),
        timeTo: hour(16),
      }),
    ]);
    specialtyRepository.findById.mockResolvedValue({
      id: 1,
      duration: 120,
      bufferMinutes: 0,
    });

    const result = await useCase.execute({ ...dto, date: '2026-06-15' });

    expect(result.map((s) => [s.startTime, s.available])).toEqual([
      ['08:00', false],
      ['10:00', false],
      ['12:00', true],
      ['14:00', true],
    ]);
  });

  it('fecha futura: la anticipación de 2 horas no aplica', async () => {
    jest.useFakeTimers({ now: new Date('2026-06-15T10:00:00.000Z') });

    const result = await useCase.execute(dto);

    expect(result.every((s) => s.available)).toBe(true);
  });
});
