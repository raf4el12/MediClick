import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProcessQrCheckInUseCase } from './process-qr-check-in.use-case.js';
import { CheckInWindowService } from '../../domain/services/check-in-window.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentQrService } from '../services/appointment-qr.service.js';
import type {
  AppointmentWithRelations,
  UpdateAppointmentData,
} from '../../domain/interfaces/appointment-data.interface.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

describe('ProcessQrCheckInUseCase (Auto Check-in QR y Turno en Sala)', () => {
  let useCase: ProcessQrCheckInUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findById' | 'update'>
  >;
  let qrService: jest.Mocked<
    Pick<AppointmentQrService, 'validateCheckInQrToken'>
  >;
  let checkInWindowService: CheckInWindowService;
  let eventEmitter: { emit: jest.Mock };

  const receptionistActor: AuthenticatedUser = {
    id: 5,
    email: 'recep@mediclick.test',
    roleId: 2,
    roleName: 'RECEPTIONIST',
    clinicId: 1,
  };

  const otherClinicReceptionist: AuthenticatedUser = {
    id: 6,
    email: 'other@mediclick.test',
    roleId: 2,
    roleName: 'RECEPTIONIST',
    clinicId: 2,
  };

  const patientActor: AuthenticatedUser = {
    id: 10,
    email: 'patient@mediclick.test',
    roleId: 1,
    roleName: 'PATIENT',
    clinicId: null,
  };

  const globalAdminWithoutClinic: AuthenticatedUser = {
    id: 1,
    email: 'admin@mediclick.test',
    roleId: 3,
    roleName: 'SUPER_ADMIN',
    clinicId: null,
  };

  // Cita: 2026-10-10 09:00 local Lima (UTC-5)
  // startsAt = 2026-10-10T14:00:00Z
  // opensAt  = 2026-10-10T13:30:00Z
  // closesAt = 2026-10-10T14:15:00Z
  const buildAppointment = (
    overrides: Partial<AppointmentWithRelations> = {},
  ): AppointmentWithRelations => ({
    id: 42,
    patientId: 10,
    scheduleId: 5,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: 'PAID',
    amount: 100,
    depositAmount: null,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    confirmedAt: null,
    checkedInAt: null,
    isAtRisk: false,
    clinicId: 1,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
    hasPrescription: false,
    notesCount: 0,
    reason: 'Control',
    notes: null,
    startTime: new Date('1970-01-01T09:00:00Z'),
    endTime: new Date('1970-01-01T09:30:00Z'),
    patient: {
      id: 10,
      profile: {
        userId: 10,
        name: 'Carlos',
        lastName: 'Santana',
        email: 'carlos@test.com',
      },
    },
    schedule: {
      id: 5,
      scheduleDate: new Date('2026-10-10T00:00:00Z'),
      timeFrom: new Date('1970-01-01T08:00:00Z'),
      timeTo: new Date('1970-01-01T14:00:00Z'),
      doctor: {
        id: 3,
        profile: { name: 'Dr. Gregory', lastName: 'House' },
        clinic: { id: 1, name: 'Sede Central', timezone: 'America/Lima' },
      },
      specialty: { id: 2, name: 'Cardiología' },
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    // Fijar tiempo a exactamente la hora de inicio de la cita: 2026-10-10T14:00:00Z
    jest.setSystemTime(new Date('2026-10-10T14:00:00Z'));

    appointmentRepository = {
      findById: jest.fn().mockResolvedValue(buildAppointment()),
      update: jest
        .fn()
        .mockImplementation((id: number, data: UpdateAppointmentData) =>
          Promise.resolve(buildAppointment({ id, ...data })),
        ),
    };

    qrService = {
      validateCheckInQrToken: jest.fn().mockReturnValue({
        valid: true,
        payload: {
          appointmentId: 42,
          patientId: 10,
          clinicId: 1,
          exp: 9999999999,
        },
      }),
    };

    checkInWindowService = new CheckInWindowService();

    eventEmitter = {
      emit: jest.fn(),
    };

    useCase = new ProcessQrCheckInUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      qrService as unknown as AppointmentQrService,
      checkInWindowService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('RED->GREEN: procesa auto check-in con token válido dentro de ventana, actualiza a IN_PROGRESS y emite evento', async () => {
    const ticket = await useCase.execute(
      { qrToken: 'mc_qr_valid.hash' },
      receptionistActor,
    );

    expect(ticket.appointmentId).toBe(42);
    expect(ticket.turnCode).toBe('T-42');
    expect(ticket.patientName).toBe('Carlos Santana');
    expect(ticket.doctorName).toBe('Dr. Gregory House');
    expect(ticket.status).toBe(AppointmentStatus.IN_PROGRESS);

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        status: AppointmentStatus.IN_PROGRESS,
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'appointment.checked_in',
      expect.objectContaining({
        appointmentId: 42,
        turnCode: 'T-42',
        clinicId: 1,
      }),
    );
  });

  it('RED->GREEN: rechaza check-in si el actor es un paciente o staff sin sede asignada', async () => {
    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, patientActor),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      useCase.execute(
        { qrToken: 'mc_qr_valid.hash' },
        globalAdminWithoutClinic,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('RED->GREEN: rechaza con 404 si la cita pertenece a otra sede', async () => {
    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, otherClinicReceptionist),
    ).rejects.toThrow(NotFoundException);
  });

  it('RED->GREEN: rechaza check-in 1ms antes de abrir la ventana (T-30m)', async () => {
    // opensAt = 2026-10-10T13:30:00Z -> 1ms antes: 13:29:59.999Z
    jest.setSystemTime(new Date('2026-10-10T13:29:59.999Z'));

    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, receptionistActor),
    ).rejects.toThrow(BadRequestException);

    expect(appointmentRepository.update).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('RED->GREEN: rechaza check-in 1ms después de cerrar la ventana (T+15m)', async () => {
    // closesAt = 2026-10-10T14:15:00Z -> 1ms después: 14:15:00.001Z
    jest.setSystemTime(new Date('2026-10-10T14:15:00.001Z'));

    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, receptionistActor),
    ).rejects.toThrow(BadRequestException);

    expect(appointmentRepository.update).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('RED->GREEN: permite check-in exactamente en el límite de apertura y cierre', async () => {
    // Límite de apertura: 13:30:00.000Z
    jest.setSystemTime(new Date('2026-10-10T13:30:00.000Z'));
    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, receptionistActor),
    ).resolves.toBeDefined();

    // Límite de cierre: 14:15:00.000Z
    jest.setSystemTime(new Date('2026-10-10T14:15:00.000Z'));
    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, receptionistActor),
    ).resolves.toBeDefined();
  });

  it('RED->GREEN: rechaza si el token QR es inválido', async () => {
    qrService.validateCheckInQrToken.mockReturnValueOnce({
      valid: false,
      error: 'Firma criptográfica inválida en token QR',
    });

    await expect(
      useCase.execute({ qrToken: 'mc_qr_corrupt.hash' }, receptionistActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('RED->GREEN: rechaza si la cita no existe', async () => {
    appointmentRepository.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, receptionistActor),
    ).rejects.toThrow(NotFoundException);
  });

  it('RED->GREEN: rechaza si la cita ya fue completada o cancelada', async () => {
    appointmentRepository.findById.mockResolvedValueOnce(
      buildAppointment({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }, receptionistActor),
    ).rejects.toThrow(BadRequestException);
  });
});
