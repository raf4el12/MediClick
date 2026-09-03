import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { RespondAppointmentReminderUseCase } from './respond-appointment-reminder.use-case.js';
import {
  ReminderTokenService,
  ReminderAction,
} from '../services/reminder-token.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentCancellationService } from '../services/appointment-cancellation.service.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';

describe('RespondAppointmentReminderUseCase', () => {
  let useCase: RespondAppointmentReminderUseCase;
  let tokenService: ReminderTokenService;
  let appointmentRepo: jest.Mocked<
    Pick<IAppointmentRepository, 'findById' | 'update'>
  >;
  let cancellationService: jest.Mocked<
    Pick<AppointmentCancellationService, 'cancel'>
  >;

  beforeEach(() => {
    const configService = {
      get: () => 'test-secret',
    } as unknown as ConfigService;
    tokenService = new ReminderTokenService(configService);

    appointmentRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<IAppointmentRepository, 'findById' | 'update'>
    >;

    cancellationService = {
      cancel: jest.fn(),
    } as unknown as jest.Mocked<Pick<AppointmentCancellationService, 'cancel'>>;

    useCase = new RespondAppointmentReminderUseCase(
      tokenService,
      appointmentRepo as unknown as IAppointmentRepository,
      cancellationService as unknown as AppointmentCancellationService,
    );
  });

  describe('Acción CONFIRM', () => {
    it('RED->GREEN: confirma asistencia de cita CONFIRMED exitosamente', async () => {
      const token = tokenService.generateToken(
        10,
        ReminderAction.CONFIRM,
        3600,
      );

      appointmentRepo.findById.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: null,
        isAtRisk: true,
        deleted: false,
      } as unknown as AppointmentWithRelations);

      appointmentRepo.update.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: new Date(),
        isAtRisk: false,
      } as unknown as AppointmentWithRelations);

      const result = await useCase.execute(token);

      expect(result.appointmentId).toBe(10);
      expect(result.action).toBe(ReminderAction.CONFIRM);
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(appointmentRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          confirmedAt: expect.any(Date) as unknown as Date,
          isAtRisk: false,
        }),
      );
    });

    it('retorna idempotentemente si la cita ya estaba confirmada', async () => {
      const token = tokenService.generateToken(
        10,
        ReminderAction.CONFIRM,
        3600,
      );

      appointmentRepo.findById.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: new Date(),
        isAtRisk: false,
        deleted: false,
      } as unknown as AppointmentWithRelations);

      const result = await useCase.execute(token);

      expect(result.alreadyConfirmed).toBe(true);
      expect(appointmentRepo.update).not.toHaveBeenCalled();
    });

    it('rechaza si la cita no existe', async () => {
      const token = tokenService.generateToken(
        999,
        ReminderAction.CONFIRM,
        3600,
      );
      appointmentRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(token)).rejects.toThrow(NotFoundException);
    });

    it('rechaza confirmación si la cita ya fue cancelada', async () => {
      const token = tokenService.generateToken(
        10,
        ReminderAction.CONFIRM,
        3600,
      );
      appointmentRepo.findById.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CANCELLED,
        deleted: false,
      } as unknown as AppointmentWithRelations);

      await expect(useCase.execute(token)).rejects.toThrow(ConflictException);
    });
  });

  describe('Acción CANCEL', () => {
    it('RED->GREEN: cancela la cita invocando AppointmentCancellationService', async () => {
      const token = tokenService.generateToken(20, ReminderAction.CANCEL, 3600);

      appointmentRepo.findById.mockResolvedValue({
        id: 20,
        status: AppointmentStatus.CONFIRMED,
        deleted: false,
      } as unknown as AppointmentWithRelations);

      cancellationService.cancel.mockResolvedValue({
        id: 20,
        status: AppointmentStatus.CANCELLED,
      } as unknown as AppointmentWithRelations);

      const result = await useCase.execute(token);

      expect(result.appointmentId).toBe(20);
      expect(result.action).toBe(ReminderAction.CANCEL);
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
      expect(cancellationService.cancel).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: 20,
          cancelledBy: 'PATIENT_REMINDER',
        }),
      );
    });

    it('retorna idempotentemente si la cita ya estaba cancelada', async () => {
      const token = tokenService.generateToken(20, ReminderAction.CANCEL, 3600);

      appointmentRepo.findById.mockResolvedValue({
        id: 20,
        status: AppointmentStatus.CANCELLED,
        deleted: false,
      } as unknown as AppointmentWithRelations);

      const result = await useCase.execute(token);

      expect(result.alreadyCancelled).toBe(true);
      expect(cancellationService.cancel).not.toHaveBeenCalled();
    });
  });
});
