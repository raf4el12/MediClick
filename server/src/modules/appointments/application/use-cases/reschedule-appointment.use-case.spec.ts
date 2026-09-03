import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RescheduleAppointmentUseCase } from './reschedule-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import type { AppointmentSlotValidatorService } from '../services/appointment-slot-validator.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import type { ScheduleWithRelations } from '../../../schedules/domain/interfaces/schedule-data.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

describe('RescheduleAppointmentUseCase — TDD', () => {
  let useCase: RescheduleAppointmentUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findById' | 'rescheduleWithOverlapCheck'>
  >;
  let scheduleRepository: jest.Mocked<Pick<IScheduleRepository, 'findById'>>;
  let slotValidator: jest.Mocked<
    Pick<AppointmentSlotValidatorService, 'validate'>
  >;

  const globalActor: AuthenticatedUser = {
    id: 900,
    email: 'admin@mediclick.test',
    roleId: 1,
    roleName: SystemRole.SUPER_ADMIN,
    clinicId: null,
  };
  const clinicActor: AuthenticatedUser = { ...globalActor, clinicId: 7 };

  const buildAppointment = (
    overrides: Partial<AppointmentWithRelations> = {},
  ): AppointmentWithRelations => ({
    id: 10,
    patientId: 1,
    scheduleId: 5,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T09:30:00.000Z'),
    status: AppointmentStatus.PENDING,
    paymentStatus: 'PENDING',
    amount: 120,
    reason: 'Control',
    notes: null,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    clinicId: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
    hasPrescription: false,
    notesCount: 0,
    patient: {
      id: 1,
      profile: {
        name: 'Ana',
        lastName: 'Gómez',
        email: 'ana@x.com',
        userId: 1,
      },
    },
    schedule: {
      id: 5,
      scheduleDate: new Date('2030-01-01T00:00:00.000Z'),
      timeFrom: new Date('1970-01-01T08:00:00.000Z'),
      timeTo: new Date('1970-01-01T17:00:00.000Z'),
      doctor: {
        id: 3,
        profile: { name: 'Dr', lastName: 'House' },
        clinic: { name: 'Clínica', timezone: 'America/Lima' },
      },
      specialty: { id: 2, name: 'Medicina' },
    },
    ...overrides,
  });

  const buildSchedule = (
    overrides: Partial<ScheduleWithRelations> = {},
  ): ScheduleWithRelations => ({
    id: 99,
    doctorId: 3,
    specialtyId: 2,
    clinicId: 1,
    scheduleDate: new Date('2030-06-01T00:00:00.000Z'),
    timeFrom: new Date('1970-01-01T08:00:00.000Z'),
    timeTo: new Date('1970-01-01T17:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: null,
    doctor: {
      id: 3,
      profile: { name: 'Dr', lastName: 'House' },
      clinic: { id: 1, timezone: 'America/Lima' },
    },
    specialty: {
      id: 2,
      name: 'Medicina',
      price: 120,
      duration: 30,
      bufferMinutes: 0,
    },
    ...overrides,
  });

  const dto = {
    newScheduleId: 99,
    startTime: '10:00',
    endTime: '10:30',
  };

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn().mockResolvedValue(buildAppointment()),
      rescheduleWithOverlapCheck: jest.fn().mockResolvedValue(
        buildAppointment({
          scheduleId: 99,
          startTime: new Date('1970-01-01T10:00:00.000Z'),
          endTime: new Date('1970-01-01T10:30:00.000Z'),
        }),
      ),
    };

    scheduleRepository = {
      findById: jest.fn().mockResolvedValue(buildSchedule()),
    };

    slotValidator = {
      validate: jest.fn().mockResolvedValue(7),
    };
    useCase = new RescheduleAppointmentUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      scheduleRepository as unknown as IScheduleRepository,
      slotValidator as unknown as AppointmentSlotValidatorService,
      new AppointmentAccessPolicy(),
    );
  });

  // ── Iteración TDD 1: Happy path ────────────────────────────────────────────

  it('RED→GREEN: reagenda correctamente con datos válidos', async () => {
    const result = await useCase.execute(10, dto, globalActor);

    expect(result.id).toBe(10);
    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        scheduleId: 99,
        status: AppointmentStatus.PENDING,
      }),
      99,
      expect.any(Date),
      expect.any(Date),
      expect.anything(),
    );
  });

  // ── Iteración TDD 2: Cita inexistente ──────────────────────────────────────

  it('RED→GREEN: lanza NotFoundException si la cita no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999, dto, globalActor)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ── Iteración TDD 3: Estados terminales (máquina de estados) ──────────────

  it('RED→GREEN: lanza BadRequestException para cita en estado COMPLETED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(useCase.execute(10, dto, globalActor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('RED→GREEN: lanza BadRequestException para cita en estado CANCELLED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.CANCELLED }),
    );

    await expect(useCase.execute(10, dto, globalActor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('permite reagendar una cita en estado CONFIRMED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.CONFIRMED }),
    );

    await expect(useCase.execute(10, dto, globalActor)).resolves.toBeDefined();
  });

  it('permite reagendar una cita en estado IN_PROGRESS', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.IN_PROGRESS }),
    );

    await expect(useCase.execute(10, dto, globalActor)).resolves.toBeDefined();
  });

  // ── Iteración TDD 4: Validación del nuevo schedule ────────────────────────

  it('RED→GREEN: lanza BadRequestException si el nuevo schedule no existe', async () => {
    scheduleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(10, dto, globalActor)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ── Iteración TDD 5: Precondiciones delegadas al slot validator ───────────

  it('valida las precondiciones del slot contra el NUEVO schedule (doctor, fecha, rango, sede)', async () => {
    await useCase.execute(10, dto, clinicActor);

    expect(slotValidator.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorId: 3,
        scheduleDate: new Date('2030-06-01T00:00:00.000Z'),
        schedTimeFrom: new Date('1970-01-01T08:00:00.000Z'),
        schedTimeTo: new Date('1970-01-01T17:00:00.000Z'),
        durationMinutes: 30,
        bufferMinutes: 0,
        jwtClinicId: 7,
      }),
    );
  });

  it('propaga la excepción del validador (p. ej. feriado/bloqueo/fecha pasada)', async () => {
    slotValidator.validate.mockRejectedValue(
      new BadRequestException('No se puede agendar una cita en un día feriado'),
    );

    await expect(useCase.execute(10, dto, globalActor)).rejects.toThrow(
      BadRequestException,
    );
    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).not.toHaveBeenCalled();
  });

  it('propaga ConflictException si el nuevo horario ya está ocupado', async () => {
    appointmentRepository.rescheduleWithOverlapCheck.mockRejectedValue(
      new ConflictException(
        'Ya existe una cita que se superpone con el horario seleccionado',
      ),
    );

    await expect(useCase.execute(10, dto, globalActor)).rejects.toThrow(
      ConflictException,
    );
  });

  // ── Iteración TDD 6: pendingUntil y reminderSent (huequecito #8) ──────────

  it('cita pagada: conserva su estado y queda sin deadline de pago', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({
        status: AppointmentStatus.CONFIRMED,
        paymentStatus: 'PAID',
        pendingUntil: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    await useCase.execute(10, dto, globalActor);

    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        status: AppointmentStatus.CONFIRMED,
        pendingUntil: null,
      }),
      99,
      expect.any(Date),
      expect.any(Date),
      expect.anything(),
    );
  });

  it('cita impaga con deadline: renueva pendingUntil hacia el futuro (el cron no la cancela al minuto)', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({
        paymentStatus: 'PENDING',
        pendingUntil: new Date('2020-01-01T00:00:00.000Z'),
      }),
    );

    await useCase.execute(10, dto, globalActor);

    const data =
      appointmentRepository.rescheduleWithOverlapCheck.mock.calls[0][1];
    expect(data.status).toBe(AppointmentStatus.PENDING);
    expect(data.pendingUntil).toBeInstanceOf(Date);
    expect((data.pendingUntil as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it('cita de staff (sin pago online): no se le asigna deadline de pago', async () => {
    await useCase.execute(10, dto, globalActor);

    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ pendingUntil: null }),
      99,
      expect.any(Date),
      expect.any(Date),
      expect.anything(),
    );
  });

  it('resetea reminderSent para que la nueva fecha reciba recordatorio', async () => {
    await useCase.execute(10, dto, globalActor);

    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ reminderSent: false }),
      99,
      expect.any(Date),
      expect.any(Date),
      expect.anything(),
    );
  });

  // ── Iteración TDD 7: Slot viejo liberado durablemente ─────────────────────

  it('delega una identidad durable al repositorio que mueve el slot', async () => {
    await useCase.execute(10, dto, globalActor);

    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).toHaveBeenCalledWith(
      10,
      expect.any(Object),
      99,
      expect.any(Date),
      expect.any(Date),
      expect.anything(),
    );
    const eventIdentity =
      appointmentRepository.rescheduleWithOverlapCheck.mock.calls[0][5];
    expect(typeof eventIdentity.operationId).toBe('string');
    expect(typeof eventIdentity.slotReleasedEventId).toBe('string');
    expect(eventIdentity.occurredAt).toBeInstanceOf(Date);
  });

  it('deja al repositorio decidir atómicamente si el slot realmente cambió', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({
        scheduleId: 99,
        startTime: new Date('1970-01-01T10:00:00.000Z'),
        endTime: new Date('1970-01-01T10:30:00.000Z'),
      }),
    );

    await useCase.execute(10, dto, globalActor);

    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).toHaveBeenCalledTimes(1);
  });

  it('propaga el fallo atómico de reagendamiento', async () => {
    appointmentRepository.rescheduleWithOverlapCheck.mockRejectedValue(
      new ConflictException('superposición'),
    );

    await expect(useCase.execute(10, dto, globalActor)).rejects.toThrow(
      ConflictException,
    );
  });

  // ── Iteración TDD 8: Verificación de argumentos al repositorio ────────────

  it('no invoca rescheduleWithOverlapCheck si la cita está en estado COMPLETED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(useCase.execute(10, dto, globalActor)).rejects.toThrow();
    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).not.toHaveBeenCalled();
  });

  it('RED->GREEN: reinicia atómicamente confirmedAt=null, isAtRisk=false y reminderSent=false al reagendar', async () => {
    const appt = buildAppointment({
      confirmedAt: new Date(),
      isAtRisk: true,
      reminderSent: true,
    });
    appointmentRepository.findById.mockResolvedValue(appt);
    scheduleRepository.findById.mockResolvedValue(buildSchedule());
    appointmentRepository.rescheduleWithOverlapCheck.mockResolvedValue({
      ...appt,
      confirmedAt: null,
      isAtRisk: false,
      reminderSent: false,
    });

    await useCase.execute(10, dto, globalActor);

    expect(
      appointmentRepository.rescheduleWithOverlapCheck,
    ).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        confirmedAt: null,
        isAtRisk: false,
        reminderSent: false,
      }),
      99,
      expect.any(Date),
      expect.any(Date),
      expect.any(Object),
    );
  });
});
