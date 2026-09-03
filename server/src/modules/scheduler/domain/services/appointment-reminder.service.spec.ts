import { AppointmentReminderService } from './appointment-reminder.service.js';
import { ReminderTokenService } from '../../../appointments/application/services/reminder-token.service.js';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import type { MailService } from '../../../../shared/mail/mail.service.js';
import type { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import type { ConfigService } from '@nestjs/config';

describe('AppointmentReminderService', () => {
  let service: AppointmentReminderService;
  let appointmentsFindMany: jest.Mock<Promise<unknown[]>, [unknown]>;
  let appointmentsUpdate: jest.Mock<Promise<unknown>, [unknown]>;
  let appointmentRemindersCreate: jest.Mock<Promise<unknown>, [unknown]>;
  let mailSend: jest.Mock<Promise<boolean>, [unknown]>;
  let createNotificationExecute: jest.Mock<Promise<{ id: number }>, [unknown]>;
  let reminderTokenService: ReminderTokenService;

  beforeEach(() => {
    appointmentsFindMany = jest.fn<Promise<unknown[]>, [unknown]>();
    appointmentsUpdate = jest.fn<Promise<unknown>, [unknown]>();
    appointmentRemindersCreate = jest.fn<Promise<unknown>, [unknown]>();
    mailSend = jest.fn<Promise<boolean>, [unknown]>().mockResolvedValue(true);
    createNotificationExecute = jest
      .fn<Promise<{ id: number }>, [unknown]>()
      .mockResolvedValue({ id: 1 });

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'BACKEND_URL') return 'http://localhost:5100';
        if (key === 'CLIENT_URL') return 'http://localhost:3000';
        return undefined;
      }),
    } as unknown as ConfigService;

    reminderTokenService = new ReminderTokenService({
      get: () => 'test-secret',
    } as unknown as ConfigService);

    const prisma = {
      appointments: {
        findMany: appointmentsFindMany,
        update: appointmentsUpdate,
      },
      appointmentReminders: {
        create: appointmentRemindersCreate,
      },
    } as unknown as PrismaService;

    const mailService = {
      send: mailSend,
    } as unknown as MailService;

    const createNotification = {
      execute: createNotificationExecute,
    } as unknown as CreateNotificationUseCase;

    service = new AppointmentReminderService(
      prisma,
      mailService,
      createNotification,
      reminderTokenService,
      configService,
    );
  });

  it('RED->GREEN: procesa recordatorio T24 con URLs firmadas y registra AppointmentReminders', async () => {
    const now = new Date('2026-10-10T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const startTime = new Date('2026-10-11T09:00:00.000Z'); // 23h después
    const mockAppt = {
      id: 101,
      startTime,
      endTime: new Date('2026-10-11T09:30:00.000Z'),
      clinicId: 1,
      patient: {
        profile: {
          name: 'Carlos',
          lastName: 'Pérez',
          userId: 55,
          user: { email: 'carlos@example.com' },
        },
      },
      schedule: {
        scheduleDate: new Date('2026-10-11T00:00:00.000Z'),
        doctor: {
          id: 10,
          profile: { name: 'Dra. María', lastName: 'Gómez' },
          clinic: { name: 'Sede Central', timezone: 'America/Lima' },
        },
        specialty: { name: 'Cardiología' },
      },
    };

    appointmentsFindMany
      .mockResolvedValueOnce([mockAppt])
      .mockResolvedValueOnce([]);

    appointmentRemindersCreate.mockResolvedValue({ id: 1 });
    appointmentsUpdate.mockResolvedValue(mockAppt);

    await service.sendReminders();

    expect(appointmentRemindersCreate).toHaveBeenCalledWith({
      data: {
        appointmentId: 101,
        kind: 'T24',
        channel: 'EMAIL',
      },
    });

    expect(mailSend).toHaveBeenCalledTimes(1);
    const mailArgs = mailSend.mock.calls[0][0] as {
      to: string;
      template: string;
      context: {
        patientName: string;
        doctorName: string;
        confirmUrl: string;
        cancelUrl: string;
        isUrgent: boolean;
      };
    };
    expect(mailArgs.to).toBe('carlos@example.com');
    expect(mailArgs.template).toBe('appointment-reminder');
    expect(mailArgs.context.patientName).toBe('Carlos Pérez');
    expect(mailArgs.context.doctorName).toBe('Dra. María Gómez');
    expect(mailArgs.context.confirmUrl).toContain(
      '/appointments/actions/respond?token=',
    );
    expect(mailArgs.context.cancelUrl).toContain(
      '/appointments/actions/respond?token=',
    );
    expect(mailArgs.context.isUrgent).toBe(false);

    expect(createNotificationExecute).toHaveBeenCalledTimes(1);
    const notifArgs = createNotificationExecute.mock.calls[0][0] as {
      userId: number;
      type: string;
    };
    expect(notifArgs.userId).toBe(55);
    expect(notifArgs.type).toBe('APPOINTMENT_REMINDER');

    jest.useRealTimers();
  });

  it('RED->GREEN: procesa recordatorio urgente T2 y marca isAtRisk = true', async () => {
    const now = new Date('2026-10-10T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const startTime = new Date('2026-10-10T12:00:00.000Z'); // 2h después
    const mockAppt = {
      id: 202,
      startTime,
      endTime: new Date('2026-10-10T12:30:00.000Z'),
      clinicId: 1,
      confirmedAt: null,
      patient: {
        profile: {
          name: 'Lucía',
          lastName: 'Ramos',
          userId: 77,
          user: { email: 'lucia@example.com' },
        },
      },
      schedule: {
        scheduleDate: new Date('2026-10-10T00:00:00.000Z'),
        doctor: {
          id: 12,
          profile: { name: 'Dr. Roberto', lastName: 'Silva' },
          clinic: { name: 'Sede Norte', timezone: 'America/Lima' },
        },
        specialty: { name: 'Pediatría' },
      },
    };

    appointmentsFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockAppt]);

    appointmentRemindersCreate.mockResolvedValue({ id: 2 });
    appointmentsUpdate.mockResolvedValue(mockAppt);

    await service.sendReminders();

    expect(appointmentRemindersCreate).toHaveBeenCalledWith({
      data: {
        appointmentId: 202,
        kind: 'T2',
        channel: 'EMAIL',
      },
    });

    expect(appointmentsUpdate).toHaveBeenCalledTimes(1);
    const updateCall = appointmentsUpdate.mock.calls[0] as [
      { where: { id: number }; data: { isAtRisk?: boolean } },
    ];
    expect(updateCall[0].where.id).toBe(202);
    expect(updateCall[0].data.isAtRisk).toBe(true);

    expect(mailSend).toHaveBeenCalledTimes(1);
    const mailArgs = mailSend.mock.calls[0][0] as {
      to: string;
      context: { isUrgent: boolean };
    };
    expect(mailArgs.to).toBe('lucia@example.com');
    expect(mailArgs.context.isUrgent).toBe(true);

    jest.useRealTimers();
  });

  it('omite envío de email si otra réplica ya insertó el recordatorio (idempotencia ante P2002)', async () => {
    const now = new Date('2026-10-10T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockAppt = {
      id: 303,
      startTime: new Date('2026-10-11T09:00:00.000Z'),
      endTime: new Date('2026-10-11T09:30:00.000Z'),
      clinicId: 1,
      patient: {
        profile: {
          name: 'Ana',
          lastName: 'Soto',
          userId: 88,
          user: { email: 'ana@example.com' },
        },
      },
      schedule: {
        scheduleDate: new Date('2026-10-11T00:00:00.000Z'),
        doctor: {
          id: 10,
          profile: { name: 'Dr. Test', lastName: 'Doc' },
          clinic: { name: 'Sede Central', timezone: 'America/Lima' },
        },
        specialty: { name: 'Medicina General' },
      },
    };

    appointmentsFindMany
      .mockResolvedValueOnce([mockAppt])
      .mockResolvedValueOnce([]);

    const err = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    appointmentRemindersCreate.mockRejectedValue(err);

    await service.sendReminders();

    expect(mailSend).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});
