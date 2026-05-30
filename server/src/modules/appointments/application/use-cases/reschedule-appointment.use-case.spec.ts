import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RescheduleAppointmentUseCase } from './reschedule-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import type { ScheduleWithRelations } from '../../../schedules/domain/interfaces/schedule-data.interface.js';

describe('RescheduleAppointmentUseCase — TDD', () => {
  let useCase: RescheduleAppointmentUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findById' | 'rescheduleWithOverlapCheck'>
  >;
  let scheduleRepository: jest.Mocked<Pick<IScheduleRepository, 'findById'>>;

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
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
    hasPrescription: false,
    notesCount: 0,
    patient: {
      id: 1,
      profile: { name: 'Ana', lastName: 'Gómez', email: 'ana@x.com', userId: 1 },
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
    scheduleDate: new Date('2030-06-01T00:00:00.000Z'),
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

    useCase = new RescheduleAppointmentUseCase(
      appointmentRepository as any,
      scheduleRepository as any,
    );
  });

  // ── Iteración TDD 1: Happy path ────────────────────────────────────────────

  it('RED→GREEN: reagenda correctamente con datos válidos', async () => {
    const result = await useCase.execute(10, dto);

    expect(result.id).toBe(10);
    expect(appointmentRepository.rescheduleWithOverlapCheck).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        scheduleId: 99,
        status: AppointmentStatus.PENDING,
      }),
      99,
      expect.any(Date),
      expect.any(Date),
    );
  });

  // ── Iteración TDD 2: Cita inexistente ──────────────────────────────────────

  it('RED→GREEN: lanza NotFoundException si la cita no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999, dto)).rejects.toThrow(NotFoundException);
  });

  // ── Iteración TDD 3: Estados terminales (máquina de estados) ──────────────

  it('RED→GREEN: lanza BadRequestException para cita en estado COMPLETED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(useCase.execute(10, dto)).rejects.toThrow(BadRequestException);
  });

  it('RED→GREEN: lanza BadRequestException para cita en estado CANCELLED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.CANCELLED }),
    );

    await expect(useCase.execute(10, dto)).rejects.toThrow(BadRequestException);
  });

  it('permite reagendar una cita en estado CONFIRMED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.CONFIRMED }),
    );

    await expect(useCase.execute(10, dto)).resolves.toBeDefined();
  });

  it('permite reagendar una cita en estado IN_PROGRESS', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.IN_PROGRESS }),
    );

    await expect(useCase.execute(10, dto)).resolves.toBeDefined();
  });

  // ── Iteración TDD 4: Validación del nuevo schedule ────────────────────────

  it('RED→GREEN: lanza BadRequestException si el nuevo schedule no existe', async () => {
    scheduleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(10, dto)).rejects.toThrow(BadRequestException);
  });

  // ── Iteración TDD 5: Validación del slot ──────────────────────────────────

  it('RED→GREEN: lanza BadRequestException si startTime >= endTime', async () => {
    await expect(
      useCase.execute(10, { ...dto, startTime: '10:30', endTime: '10:00' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('RED→GREEN: lanza BadRequestException si el slot está fuera del rango del turno', async () => {
    scheduleRepository.findById.mockResolvedValue(
      buildSchedule({
        timeFrom: new Date('1970-01-01T14:00:00.000Z'),
        timeTo: new Date('1970-01-01T17:00:00.000Z'),
      }),
    );

    // slot 10:00-10:30 queda fuera del rango 14:00-17:00
    await expect(useCase.execute(10, dto)).rejects.toThrow(BadRequestException);
  });

  it('acepta un slot que cabe exactamente en el límite del turno', async () => {
    scheduleRepository.findById.mockResolvedValue(
      buildSchedule({
        timeFrom: new Date('1970-01-01T10:00:00.000Z'),
        timeTo: new Date('1970-01-01T10:30:00.000Z'),
      }),
    );

    await expect(useCase.execute(10, dto)).resolves.toBeDefined();
  });

  // ── Iteración TDD 6: Verificación de argumentos al repositorio ────────────

  it('no invoca rescheduleWithOverlapCheck si la cita está en estado COMPLETED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(useCase.execute(10, dto)).rejects.toThrow();
    expect(appointmentRepository.rescheduleWithOverlapCheck).not.toHaveBeenCalled();
  });
});
