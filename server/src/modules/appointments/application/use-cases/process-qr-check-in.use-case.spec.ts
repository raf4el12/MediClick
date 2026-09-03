import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProcessQrCheckInUseCase } from './process-qr-check-in.use-case.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentQrService } from '../services/appointment-qr.service.js';
import type {
  AppointmentWithRelations,
  UpdateAppointmentData,
} from '../../domain/interfaces/appointment-data.interface.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

describe('ProcessQrCheckInUseCase (Auto Check-in QR y Turno en Sala)', () => {
  let useCase: ProcessQrCheckInUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findById' | 'update'>
  >;
  let qrService: jest.Mocked<
    Pick<AppointmentQrService, 'validateCheckInQrToken'>
  >;
  let eventEmitter: { emit: jest.Mock };

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
    startTime: new Date('1970-01-01T10:00:00Z'),
    endTime: new Date('1970-01-01T10:30:00Z'),
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
      scheduleDate: new Date('2026-10-15'),
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

    eventEmitter = {
      emit: jest.fn(),
    };

    useCase = new ProcessQrCheckInUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      qrService as unknown as AppointmentQrService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('RED->GREEN: procesa auto check-in con token válido, actualiza estado a IN_PROGRESS, fecha checkedInAt y emite evento', async () => {
    const ticket = await useCase.execute({
      qrToken: 'mc_qr_valid.hash',
      kioskClinicId: 1,
    });

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
    const updateCall = appointmentRepository.update.mock.calls[0];
    expect(updateCall[1].checkedInAt).toBeInstanceOf(Date);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'appointment.checked_in',
      expect.objectContaining({
        appointmentId: 42,
        turnCode: 'T-42',
        clinicId: 1,
      }),
    );
  });

  it('RED->GREEN: rechaza check-in si el token QR es inválido', async () => {
    qrService.validateCheckInQrToken.mockReturnValueOnce({
      valid: false,
      error: 'Firma criptográfica inválida en token QR',
    });

    await expect(
      useCase.execute({ qrToken: 'mc_qr_corrupt.hash' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('RED->GREEN: rechaza check-in si la cita no pertenece a la sede del kiosco escaneado', async () => {
    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash', kioskClinicId: 999 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('RED->GREEN: rechaza si la cita no existe', async () => {
    appointmentRepository.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('RED->GREEN: rechaza si la cita ya fue completada o cancelada', async () => {
    appointmentRepository.findById.mockResolvedValueOnce(
      buildAppointment({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(
      useCase.execute({ qrToken: 'mc_qr_valid.hash' }),
    ).rejects.toThrow(BadRequestException);
  });
});
