import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePatientAppointmentUseCase } from './create-patient-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import type { AppointmentSlotValidatorService } from '../services/appointment-slot-validator.service.js';
import type { ScheduleWithRelations } from '../../../schedules/domain/interfaces/schedule-data.interface.js';

describe('CreatePatientAppointmentUseCase — TDD', () => {
  let useCase: CreatePatientAppointmentUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'createWithOverlapCheck'>
  >;
  let patientRepository: jest.Mocked<Pick<IPatientRepository, 'findByUserId'>>;
  let scheduleRepository: jest.Mocked<Pick<IScheduleRepository, 'findById'>>;
  let slotValidator: jest.Mocked<
    Pick<AppointmentSlotValidatorService, 'validate'>
  >;

  // Fecha futura garantizada — nunca será "pasada" en los tests
  const FUTURE_DATE = new Date('2030-12-01T00:00:00.000Z');

  const buildPatient = () => ({ id: 5 });

  const buildSchedule = (
    overrides: Partial<ScheduleWithRelations> = {},
  ): ScheduleWithRelations => ({
    id: 20,
    doctorId: 3,
    specialtyId: 2,
    scheduleDate: FUTURE_DATE,
    timeFrom: new Date('1970-01-01T08:00:00.000Z'),
    timeTo: new Date('1970-01-01T17:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: null,
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
      createWithOverlapCheck: jest.fn().mockResolvedValue(buildAppointment()),
    };

    slotValidator = {
      validate: jest.fn().mockResolvedValue(1),
    };

    useCase = new CreatePatientAppointmentUseCase(
      appointmentRepository as any,
      patientRepository as any,
      scheduleRepository as any,
      slotValidator as any,
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

  it('crea la cita atómicamente con monto y pendingUntil en la misma transacción', async () => {
    await useCase.execute(42, dto);

    expect(appointmentRepository.createWithOverlapCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 5,
        scheduleId: 20,
        amount: 120,
        pendingUntil: expect.any(Date),
      }),
      expect.any(Date),
      expect.any(Date),
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

  // ── Iteración TDD 5: Precondiciones delegadas al slot validator ───────────

  it('delega las precondiciones al validador sin sede (el paciente reserva en cualquier clínica)', async () => {
    await useCase.execute(42, dto);

    expect(slotValidator.validate).toHaveBeenCalledWith({
      doctorId: 3,
      scheduleDate: FUTURE_DATE,
      schedTimeFrom: new Date('1970-01-01T08:00:00.000Z'),
      schedTimeTo: new Date('1970-01-01T17:00:00.000Z'),
      slotStart: expect.any(Date),
      slotEnd: expect.any(Date),
    });
  });

  it('asocia a la cita el clinicId del doctor retornado por el validador', async () => {
    slotValidator.validate.mockResolvedValue(7);

    await useCase.execute(42, dto);

    expect(appointmentRepository.createWithOverlapCheck).toHaveBeenCalledWith(
      expect.objectContaining({ clinicId: 7 }),
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('propaga BadRequestException del validador (rango/fecha pasada/2h/feriado)', async () => {
    slotValidator.validate.mockRejectedValue(
      new BadRequestException('No se puede agendar una cita en un día feriado'),
    );

    await expect(useCase.execute(42, dto)).rejects.toThrow(BadRequestException);
    expect(appointmentRepository.createWithOverlapCheck).not.toHaveBeenCalled();
  });

  it('propaga ConflictException del validador (bloqueo del doctor)', async () => {
    slotValidator.validate.mockRejectedValue(
      new ConflictException(
        'El doctor tiene un bloqueo de horario que cubre la fecha/hora seleccionada',
      ),
    );

    await expect(useCase.execute(42, dto)).rejects.toThrow(ConflictException);
    expect(appointmentRepository.createWithOverlapCheck).not.toHaveBeenCalled();
  });

  it('RED→GREEN: propaga ConflictException si la creación atómica detecta superposición', async () => {
    appointmentRepository.createWithOverlapCheck.mockRejectedValue(
      new ConflictException(
        'Ya existe una cita que se superpone con el horario seleccionado',
      ),
    );

    await expect(useCase.execute(42, dto)).rejects.toThrow(ConflictException);
  });

  // ── Iteración TDD 6: Verificaciones previas + creación atómica ─────────────

  it('valida precondiciones antes de crear la cita atómicamente', async () => {
    await useCase.execute(42, dto);

    expect(slotValidator.validate).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.createWithOverlapCheck).toHaveBeenCalledTimes(1);
  });
});
