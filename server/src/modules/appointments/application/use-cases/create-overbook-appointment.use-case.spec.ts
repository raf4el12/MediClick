import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateOverbookAppointmentUseCase } from './create-overbook-appointment.use-case.js';
import type { ScheduleWithAvailability } from '../../../schedules/domain/interfaces/schedule-data.interface.js';

describe('CreateOverbookAppointmentUseCase', () => {
  let useCase: CreateOverbookAppointmentUseCase;
  let appointmentRepository: {
    createOverbookAtomic: jest.Mock;
    findByDoctorAndDate: jest.Mock;
  };
  let patientRepository: { findById: jest.Mock };
  let doctorRepository: { findById: jest.Mock };
  let scheduleRepository: { findByDoctorAndDate: jest.Mock };
  let specialtyRepository: { findById: jest.Mock };
  let holidayRepository: { isHoliday: jest.Mock };
  let scheduleBlockRepository: { isBlocked: jest.Mock };
  let timezoneResolver: { resolveByDoctorId: jest.Mock };

  const FUTURE_DATE = '2099-01-15';
  const hour = (h: number, m = 0) => new Date(Date.UTC(1970, 0, 1, h, m));

  const buildSchedule = (
    overrides: Partial<ScheduleWithAvailability> = {},
  ): ScheduleWithAvailability => ({
    id: 50,
    doctorId: 3,
    specialtyId: 2,
    scheduleDate: new Date(`${FUTURE_DATE}T00:00:00.000Z`),
    timeFrom: hour(8),
    timeTo: hour(17),
    hasActiveAppointment: false,
    ...overrides,
  });

  const buildActiveAppointment = (endTime: Date, status = 'CONFIRMED') =>
    ({ scheduleId: 50, status, endTime }) as any;

  const buildCreated = () => ({
    id: 100,
    patientId: 5,
    scheduleId: 50,
    startTime: hour(17),
    endTime: hour(17, 30),
    reason: 'Urgencia',
    notes: null,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    amount: null,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: true,
    pendingUntil: null,
    hasPrescription: false,
    notesCount: 0,
    createdAt: new Date(),
    patient: {
      id: 5,
      profile: { name: 'Ana', lastName: 'Gómez', email: 'ana@x.com' },
    },
    schedule: {
      id: 50,
      scheduleDate: new Date(`${FUTURE_DATE}T00:00:00.000Z`),
      timeFrom: hour(8),
      timeTo: hour(17),
      doctor: {
        id: 3,
        profile: { name: 'Dr', lastName: 'House' },
        clinic: { timezone: 'America/Lima' },
      },
      specialty: { id: 2, name: 'Medicina' },
    },
  });

  const dto = {
    patientId: 5,
    doctorId: 3,
    specialtyId: 2,
    date: FUTURE_DATE,
    reason: 'Urgencia',
  };

  beforeEach(() => {
    appointmentRepository = {
      createOverbookAtomic: jest.fn().mockResolvedValue(buildCreated()),
      findByDoctorAndDate: jest.fn().mockResolvedValue([]),
    };
    patientRepository = { findById: jest.fn().mockResolvedValue({ id: 5 }) };
    doctorRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 3, clinicId: 7, maxOverbookPerDay: 2 }),
    };
    scheduleRepository = {
      findByDoctorAndDate: jest.fn().mockResolvedValue([buildSchedule()]),
    };
    specialtyRepository = {
      findById: jest.fn().mockResolvedValue({ id: 2, duration: 30 }),
    };
    holidayRepository = { isHoliday: jest.fn().mockResolvedValue(false) };
    scheduleBlockRepository = {
      isBlocked: jest.fn().mockResolvedValue(false),
    };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('UTC'),
    };

    useCase = new CreateOverbookAppointmentUseCase(
      appointmentRepository as any,
      patientRepository as any,
      doctorRepository as any,
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

  it('sin citas activas: el sobrecupo empieza al final del turno', async () => {
    await useCase.execute(dto);

    expect(appointmentRepository.createOverbookAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: hour(17),
        endTime: hour(17, 30),
        isOverbook: true,
        clinicId: 7,
      }),
      3,
      expect.any(Date),
      2,
    );
  });

  it('citas activas que terminan antes del fin del turno: NO pisa los slots libres (arranca al fin del turno)', async () => {
    appointmentRepository.findByDoctorAndDate.mockResolvedValue([
      buildActiveAppointment(hour(10)),
    ]);

    await useCase.execute(dto);

    expect(appointmentRepository.createOverbookAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: hour(17), endTime: hour(17, 30) }),
      3,
      expect.any(Date),
      2,
    );
  });

  it('sobrecupo previo que termina después del turno: encadena a continuación', async () => {
    appointmentRepository.findByDoctorAndDate.mockResolvedValue([
      buildActiveAppointment(hour(17, 30)),
    ]);

    await useCase.execute(dto);

    expect(appointmentRepository.createOverbookAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: hour(17, 30),
        endTime: hour(18),
      }),
      3,
      expect.any(Date),
      2,
    );
  });

  it('ignora citas canceladas/no-show al calcular el inicio', async () => {
    appointmentRepository.findByDoctorAndDate.mockResolvedValue([
      buildActiveAppointment(hour(18), 'CANCELLED'),
      buildActiveAppointment(hour(19), 'NO_SHOW'),
    ]);

    await useCase.execute(dto);

    expect(appointmentRepository.createOverbookAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: hour(17) }),
      3,
      expect.any(Date),
      2,
    );
  });

  it('feriado (de la sede del doctor): lanza BadRequest sin crear', async () => {
    holidayRepository.isHoliday.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toThrow(
      'No se puede crear un sobrecupo en un día feriado',
    );
    expect(holidayRepository.isHoliday).toHaveBeenCalledWith(
      new Date(`${FUTURE_DATE}T00:00:00.000Z`),
      7,
    );
    expect(appointmentRepository.createOverbookAtomic).not.toHaveBeenCalled();
  });

  it('bloqueo del doctor sobre el rango del sobrecupo: lanza Conflict sin crear', async () => {
    scheduleBlockRepository.isBlocked.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
    expect(scheduleBlockRepository.isBlocked).toHaveBeenCalledWith(
      3,
      new Date(`${FUTURE_DATE}T00:00:00.000Z`),
      hour(17),
      hour(17, 30),
    );
    expect(appointmentRepository.createOverbookAtomic).not.toHaveBeenCalled();
  });

  it('hoy sin 2 horas de anticipación: lanza BadRequest', async () => {
    // Turno termina 17:00 → el sobrecupo arranca 17:00; a las 16:00 falta 1h
    jest.useFakeTimers({ now: new Date('2026-06-15T16:00:00.000Z') });

    await expect(
      useCase.execute({ ...dto, date: '2026-06-15' }),
    ).rejects.toThrow('2 horas de anticipación');
    expect(appointmentRepository.createOverbookAtomic).not.toHaveBeenCalled();
  });

  it('hoy con anticipación suficiente: crea el sobrecupo', async () => {
    jest.useFakeTimers({ now: new Date('2026-06-15T10:00:00.000Z') });

    await expect(
      useCase.execute({ ...dto, date: '2026-06-15' }),
    ).resolves.toBeDefined();
  });

  it('fecha pasada: lanza BadRequest', async () => {
    await expect(
      useCase.execute({ ...dto, date: '2020-01-01' }),
    ).rejects.toThrow('fecha pasada');
  });

  it('staff no puede crear sobrecupos para un doctor de otra sede', async () => {
    await expect(useCase.execute(dto, 9)).rejects.toThrow(ForbiddenException);
    expect(appointmentRepository.createOverbookAtomic).not.toHaveBeenCalled();
  });

  it('sin horarios del doctor para la fecha: lanza BadRequest', async () => {
    scheduleRepository.findByDoctorAndDate.mockResolvedValue([]);

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it('propaga ConflictException de la creación atómica (límite diario u overlap)', async () => {
    appointmentRepository.createOverbookAtomic.mockRejectedValue(
      new ConflictException(
        'Ya existe una cita que se superpone con el horario del sobrecupo',
      ),
    );

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
  });
});
