/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { AppointmentController } from './appointment.controller.js';
import type { RespondAppointmentReminderUseCase } from '../../application/use-cases/respond-appointment-reminder.use-case.js';
import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ReminderTokenService,
  ReminderAction,
} from '../../application/services/reminder-token.service.js';

describe('AppointmentController — reminder actions', () => {
  let controller: AppointmentController;
  let respondUseCase: jest.Mocked<
    Pick<RespondAppointmentReminderUseCase, 'execute'>
  >;
  let configService: ConfigService;
  let reminderTokenService: ReminderTokenService;
  let response: {
    redirect: jest.Mock;
    status: jest.Mock;
    json: jest.Mock;
  };

  beforeEach(() => {
    respondUseCase = {
      execute: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'CLIENT_URL') return 'http://localhost:3000';
        return undefined;
      }),
    } as unknown as ConfigService;
    reminderTokenService = new ReminderTokenService({
      get: () => 'test-secret',
    } as unknown as ConfigService);

    response = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    controller = new AppointmentController(
      {} as any, // createAppointmentUseCase
      {} as any, // getDashboardAppointmentsUseCase
      {} as any, // getDoctorDailyAppointmentsUseCase
      {} as any, // checkInAppointmentUseCase
      {} as any, // cancelAppointmentUseCase
      {} as any, // confirmAppointmentUseCase
      {} as any, // createOverbookAppointmentUseCase
      {} as any, // rescheduleAppointmentUseCase
      {} as any, // completeAppointmentUseCase
      {} as any, // markNoShowAppointmentUseCase
      {} as any, // getMyAppointmentsUseCase
      {} as any, // createPatientAppointmentUseCase
      respondUseCase as unknown as RespondAppointmentReminderUseCase,
      {} as any, // processQrCheckInUseCase
      {} as any, // issueAppointmentQrUseCase
      configService,
      reminderTokenService,
    );
  });

  it('RED->GREEN: GET /appointments/actions/respond NO muta estado y solo redirige a la pantalla de confirmación', () => {
    const token = reminderTokenService.generateToken(
      10,
      ReminderAction.CONFIRM,
      3600,
    );

    controller.respondToReminder(token, response as unknown as Response);

    expect(respondUseCase.execute).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/appointment/respond?token='),
    );
  });

  it('RED->GREEN: POST /appointments/actions/respond ejecuta la mutación llamando al use case', async () => {
    const token = reminderTokenService.generateToken(
      10,
      ReminderAction.CONFIRM,
      3600,
    );
    respondUseCase.execute.mockResolvedValue({
      appointmentId: 10,
      action: ReminderAction.CONFIRM,
      status: 'CONFIRMED' as any,
      message: 'OK',
    });

    const result = await controller.respondToReminderApi({ token });

    expect(respondUseCase.execute).toHaveBeenCalledWith(token);
    expect(result.appointmentId).toBe(10);
  });
});
