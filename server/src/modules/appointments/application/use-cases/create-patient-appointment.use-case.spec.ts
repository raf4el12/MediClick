import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePatientAppointmentUseCase } from './create-patient-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';

describe('CreatePatientAppointmentUseCase — TDD', () => {
  let useCase: CreatePatientAppointmentUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'create' | 'hasOverlappingAppointment'>
  >;
  let patientRepository: jest.Mocked<Pick<IPatientRepository, 'findByUserId'>>;
  let scheduleRepository: jest.Mocked<Pick<IScheduleRepository, 'findById'>>;
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
  let prisma: any;

  // Fecha futura garantizada — nunca será "pasada" en los tests
  const FUTURE_DATE = new Date('2030-12-01T00:00:00.000Z');

  const buildPatient = () => ({ id: 5 });

  const buildSchedule = (overrides: Partial<any> = {}) => ({
    id: 20,
    scheduleDate: FUTURE_DATE,
    timeFrom: new Date('1970-01-01T08:00:00.000Z'),
    timeTo: new Date('1970-01-01T17:00:00.000Z'),
    doctorId: 3,
    doctor: {
      id: 3,
      profile: { name: 'Dr', lastName: 'House' },
      clinic: { timezone: 'America/Lima' },
    },
    specialty: { id: 2, name: 'Medicina', price: 120 },
    ...overrides,
  });

  const buildAppointment = () => ({
    id: 100,
    patientId: 5,
    scheduleId: 20,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T09:30:00.000Z'),
    reason: 'Control',
    notes: null,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    amount: 120,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    hasPrescription: false,
    notesCount: 0,
    createdAt: new Date(),
    patient: {
      id: 5,
      profile: { name: 'Ana', lastName: 'Gómez', email: 'ana@x.com' },
    },
    schedule: {
      id: 20,
      scheduleDate: FUTURE_DATE,
      timeFrom: new Date('1970-01-01T08:00:00.000Z'),
      timeTo: new Date('1970-01-01T17:00:00.000Z'),
      doctor: {
        id: 3,
        profile: { name: 'Dr', lastName: 'House' },
        clinic: { timezone: 'America/Lima' },
      },
      specialty: { id: 2, name: 'Medicina', price: 120 },
    },
  });

  const dto = {
    scheduleId: 20,
    startTime: '09:00',
    endTime: '09:30',
    reason: 'Control rutinario',
  };

  beforeEach(() => {
    patientRepository = {
      findByUserId: jest.fn().mockResolvedValue(buildPatient()),
    };

    scheduleRepository = {
      findById: jest.fn().mockResolvedValue(buildSchedule()),
    };

    appointmentRepository = {
      create: jest.fn().mockResolvedValue(buildAppointment()),
      hasOverlappingAppointment: jest.fn().mockResolvedValue(false),
    };

    holidayRepository = {
      isHoliday: jest.fn().mockResolvedValue(false),
    };

    scheduleBlockRepository = {
      isBlocked: jest.fn().mockResolvedValue(false),
    };

    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('America/Lima'),
      resolveClinicIdByDoctorId: jest.fn().mockResolvedValue(1),
    };

    prisma = {
      appointments: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    useCase = new CreatePatientAppointmentUseCase(
      appointmentRepository as any,
      patientRepository as any,
      scheduleRepository as any,
      holidayRepository as any,
      scheduleBlockRepository as any,
      timezoneResolver as any,
      prisma,
    );
  });

  // ── Iteración TDD 1: Happy path ────────────────────────────────────────────

  it('RED→GREEN: crea la cita y retorna el DTO completo', async () => {
    const result = await useCase.execute(42, dto);

    expect(result.id).toBe(100);
    expect(result.amount).toBe(120);
    expect(result.status).toBe('PENDING');
    expect(result.paymentStatus).toBe('PENDING');
  });

  it('establece pendingUntil en la cita recién creada', async () => {
    await useCase.execute(42, dto);

    expect(prisma.appointments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 100 },
        data: expect.objectContaining({
          amount: 120,
          pendingUntil: expect.any(Date),
        }),
      }),
    );
  });

  // ── Iteración TDD 2: Paciente no encontrado ────────────────────────────────

  it('RED→GREEN: lanza NotFoundException si el usuario no tiene perfil de paciente', async () => {
    patientRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(42, dto)).rejects.toThrow(NotFoundException);
  });

  // ── Iteración TDD 3: Horario inexistente ──────────────────────────────────

  it('RED→GREEN: lanza BadRequestException si el schedule no existe', async () => {
    scheduleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(42, dto)).rejects.toThrow(BadRequestException);
  });

  // ── Iteración TDD 4: Especialidad sin precio ───────────────────────────────

  it('RED→GREEN: lanza BadRequestException si la especialidad no tiene precio', async () => {
    scheduleRepository.findById.mockResolvedValue(
      buildSchedule({ specialty: { id: 2, name: 'Medicina', price: 0 } }),
    );

    await expect(useCase.execute(42, dto)).rejects.toThrow(BadRequestException);
  });

  it('RED→GREEN: lanza BadRequestException si el precio de especialidad es null', async () => {
    scheduleRepository.findById.mockResolvedValue(
      buildSchedule({ specialty: { id: 2, name: 'Medicina', price: null } }),
    );

    await expect(useCase.execute(42, dto)).rejects.toThrow(BadRequestException);
  });

  // ── Iteración TDD 5: Validación de slot ───────────────────────────────────

  it('RED→GREEN: lanza BadRequestException si startTime >= endTime', async () => {
    await expect(
      useCase.execute(42, { ...dto, startTime: '10:00', endTime: '09:00' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('RED→GREEN: lanza BadRequestException si el slot está fuera del rango del turno', async () => {
    // Turno 08:00–09:00, slot solicitado 09:00–09:30 supera el límite
    scheduleRepository.findById.mockResolvedValue(
      buildSchedule({
        timeFrom: new Date('1970-01-01T08:00:00.000Z'),
        timeTo: new Date('1970-01-01T09:00:00.000Z'),
      }),
    );

    await expect(
      useCase.execute(42, { ...dto, startTime: '09:00', endTime: '09:30' }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Iteración TDD 6: Fecha pasada ─────────────────────────────────────────

  it('RED→GREEN: lanza BadRequestException si la fecha del schedule es pasada', async () => {
    scheduleRepository.findById.mockResolvedValue(
      buildSchedule({ scheduleDate: new Date('2020-01-01T00:00:00.000Z') }),
    );

    await expect(useCase.execute(42, dto)).rejects.toThrow(BadRequestException);
  });

  // ── Iteración TDD 7: Buffer de 2 horas ────────────────────────────────────

  it('RED→GREEN: lanza BadRequestException si el slot es hoy y tiene menos de 2h de anticipación', async () => {
    // Usar hoy UTC como fecha del schedule y slot a las 00:01 (siempre < 2h desde ahora)
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    scheduleRepository.findById.mockResolvedValue(
      buildSchedule({ scheduleDate: todayUTC }),
    );

    // 00:01 siempre tiene menos de 2h de buffer respecto a cualquier hora actual
    await expect(
      useCase.execute(42, { ...dto, startTime: '00:01', endTime: '00:30' }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Iteración TDD 8: Restricciones de disponibilidad ─────────────────────

  it('RED→GREEN: lanza BadRequestException si la fecha es feriado', async () => {
    holidayRepository.isHoliday.mockResolvedValue(true);

    await expect(useCase.execute(42, dto)).rejects.toThrow(BadRequestException);
  });

  it('RED→GREEN: lanza ConflictException si el doctor tiene un bloqueo de horario', async () => {
    scheduleBlockRepository.isBlocked.mockResolvedValue(true);

    await expect(useCase.execute(42, dto)).rejects.toThrow(ConflictException);
  });

  it('RED→GREEN: lanza ConflictException si ya existe una cita superpuesta', async () => {
    appointmentRepository.hasOverlappingAppointment.mockResolvedValue(true);

    await expect(useCase.execute(42, dto)).rejects.toThrow(ConflictException);
  });

  // ── Iteración TDD 9: Verificaciones en paralelo ───────────────────────────

  it('consulta feriados, bloqueos y superposiciones en la misma llamada', async () => {
    await useCase.execute(42, dto);

    expect(holidayRepository.isHoliday).toHaveBeenCalledTimes(1);
    expect(scheduleBlockRepository.isBlocked).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.hasOverlappingAppointment).toHaveBeenCalledTimes(1);
  });
});
