import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentSlotValidatorService } from './appointment-slot-validator.service.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import type { ValidateSlotParams } from './appointment-slot-validator.service.js';

describe('AppointmentSlotValidatorService', () => {
  let validator: AppointmentSlotValidatorService;
  let holidayRepository: jest.Mocked<Pick<IHolidayRepository, 'isHoliday'>>;
  let scheduleBlockRepository: jest.Mocked<
    Pick<IScheduleBlockRepository, 'isBlocked'>
  >;
  let timezoneResolver: jest.Mocked<
    Pick<
      TimezoneResolverService,
      'resolveByDoctorId' | 'resolveClinicIdByDoctorId'
    >
  >;

  // Fecha futura garantizada — nunca será "pasada"
  const FUTURE_DATE = new Date('2030-12-01T00:00:00.000Z');

  const buildParams = (
    overrides: Partial<ValidateSlotParams> = {},
  ): ValidateSlotParams => ({
    doctorId: 3,
    scheduleDate: FUTURE_DATE,
    schedTimeFrom: new Date('1970-01-01T08:00:00.000Z'),
    schedTimeTo: new Date('1970-01-01T17:00:00.000Z'),
    slotStart: new Date('1970-01-01T09:00:00.000Z'),
    slotEnd: new Date('1970-01-01T09:30:00.000Z'),
    durationMinutes: 30,
    bufferMinutes: 0,
    ...overrides,
  });

  beforeEach(() => {
    holidayRepository = { isHoliday: jest.fn().mockResolvedValue(false) };
    scheduleBlockRepository = { isBlocked: jest.fn().mockResolvedValue(false) };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('America/Lima'),
      resolveClinicIdByDoctorId: jest.fn().mockResolvedValue(7),
    };

    validator = new AppointmentSlotValidatorService(
      holidayRepository as any,
      scheduleBlockRepository as any,
      timezoneResolver as any,
    );
  });

  it('retorna el clinicId del doctor cuando todas las precondiciones pasan', async () => {
    await expect(validator.validate(buildParams())).resolves.toBe(7);
  });

  it('lanza BadRequestException si startTime >= endTime', async () => {
    await expect(
      validator.validate(
        buildParams({
          slotStart: new Date('1970-01-01T10:00:00.000Z'),
          slotEnd: new Date('1970-01-01T09:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el slot está fuera del rango del turno', async () => {
    await expect(
      validator.validate(
        buildParams({
          schedTimeFrom: new Date('1970-01-01T14:00:00.000Z'),
          schedTimeTo: new Date('1970-01-01T17:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el slot no dura exactamente specialty.duration', async () => {
    await expect(
      validator.validate(
        buildParams({
          slotStart: new Date('1970-01-01T09:00:00.000Z'),
          slotEnd: new Date('1970-01-01T10:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow('El slot debe durar exactamente 30 minutos');
  });

  it('lanza BadRequestException si el slot no está alineado a la grilla', async () => {
    await expect(
      validator.validate(
        buildParams({
          slotStart: new Date('1970-01-01T09:10:00.000Z'),
          slotEnd: new Date('1970-01-01T09:40:00.000Z'),
        }),
      ),
    ).rejects.toThrow('no está alineado a la grilla');
  });

  it('la grilla considera el buffer entre slots (duración + descanso)', async () => {
    // Grilla 08:00 con paso 25 (20 + 5): 08:00, 08:25, 08:50…
    await expect(
      validator.validate(
        buildParams({
          durationMinutes: 20,
          bufferMinutes: 5,
          slotStart: new Date('1970-01-01T08:25:00.000Z'),
          slotEnd: new Date('1970-01-01T08:45:00.000Z'),
        }),
      ),
    ).resolves.toBe(7);

    await expect(
      validator.validate(
        buildParams({
          durationMinutes: 20,
          bufferMinutes: 5,
          slotStart: new Date('1970-01-01T08:20:00.000Z'),
          slotEnd: new Date('1970-01-01T08:40:00.000Z'),
        }),
      ),
    ).rejects.toThrow('no está alineado a la grilla');
  });

  it('lanza BadRequestException si la especialidad no tiene duración configurada', async () => {
    await expect(
      validator.validate(buildParams({ durationMinutes: 0 })),
    ).rejects.toThrow('La especialidad no tiene una duración configurada');
  });

  it('lanza BadRequestException si la fecha es pasada', async () => {
    await expect(
      validator.validate(
        buildParams({ scheduleDate: new Date('2020-01-01T00:00:00.000Z') }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el slot de hoy tiene menos de 2h de anticipación', async () => {
    // Timezone UTC para que "hoy" del validador coincida con la fecha UTC del test
    timezoneResolver.resolveByDoctorId.mockResolvedValue('UTC');
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    await expect(
      validator.validate(
        buildParams({
          scheduleDate: todayUTC,
          schedTimeFrom: new Date('1970-01-01T00:00:00.000Z'),
          schedTimeTo: new Date('1970-01-01T23:30:00.000Z'),
          slotStart: new Date('1970-01-01T00:00:00.000Z'),
          slotEnd: new Date('1970-01-01T00:30:00.000Z'),
        }),
      ),
    ).rejects.toThrow('2 horas de anticipación');
  });

  it('lanza ForbiddenException si el doctor es de otra sede que la del JWT', async () => {
    timezoneResolver.resolveClinicIdByDoctorId.mockResolvedValue(99);

    await expect(
      validator.validate(buildParams({ jwtClinicId: 7 })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite agendar sin jwtClinicId (no valida sede)', async () => {
    timezoneResolver.resolveClinicIdByDoctorId.mockResolvedValue(99);

    await expect(validator.validate(buildParams())).resolves.toBe(99);
  });

  it('lanza BadRequestException si la fecha es feriado', async () => {
    holidayRepository.isHoliday.mockResolvedValue(true);

    await expect(validator.validate(buildParams())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza ConflictException si el doctor tiene un bloqueo de horario', async () => {
    scheduleBlockRepository.isBlocked.mockResolvedValue(true);

    await expect(validator.validate(buildParams())).rejects.toThrow(
      ConflictException,
    );
  });
});
