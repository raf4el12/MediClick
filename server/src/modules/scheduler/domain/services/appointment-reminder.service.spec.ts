/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AppointmentReminderService } from './appointment-reminder.service.js';
import { ReminderTokenService } from '../../../appointments/application/services/reminder-token.service.js';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import type { MailService } from '../../../../shared/mail/mail.service.js';
import type { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import type { ConfigService } from '@nestjs/config';
import type { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';
import type {
  IAppointmentReminderDeliveryRepository,
  ClaimReminderDeliveryInput,
} from '../repositories/appointment-reminder-delivery.repository.js';
import { ReminderKind } from '@prisma/client';

describe('AppointmentReminderService', () => {
  let service: AppointmentReminderService;
  let appointmentsFindMany: jest.Mock<Promise<unknown[]>, [unknown]>;
  let appointmentsUpdate: jest.Mock<Promise<unknown>, [unknown]>;
  let mailSend: jest.Mock<Promise<boolean>, [unknown]>;
  let createNotificationExecute: jest.Mock<Promise<{ id: number }>, [unknown]>;
  let reminderDeliveryRepo: jest.Mocked<IAppointmentReminderDeliveryRepository>;
  let reminderTokenService: ReminderTokenService;

  beforeEach(() => {
    appointmentsFindMany = jest.fn<Promise<unknown[]>, [unknown]>();
    appointmentsUpdate = jest.fn<Promise<unknown>, [unknown]>();
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
    } as unknown as PrismaService;

    const mailService = {
      send: mailSend,
    } as unknown as MailService;

    const createNotification = {
      execute: createNotificationExecute,
    } as unknown as CreateNotificationUseCase;

    const jobLeaseService = {
      withLease: jest
        .fn()
        .mockImplementation(async (_name, _windowId, _ttl, fn) => {
          const res = await (fn as () => Promise<unknown>)();
          return { executed: true, result: res };
        }),
    } as unknown as JobLeaseService;

    reminderDeliveryRepo = {
      claim: jest.fn().mockImplementation((input: ClaimReminderDeliveryInput) =>
        Promise.resolve({
          id: 99,
          appointmentId: input.appointmentId,
          kind: input.kind,
          channel: input.channel,
          scheduledFor: input.scheduledFor,
          claimToken: 'token-99',
        }),
      ),
      markSent: jest.fn().mockResolvedValue(true),
      markFailed: jest.fn().mockResolvedValue(true),
    };

    service = new AppointmentReminderService(
      prisma,
      mailService,
      createNotification,
      reminderTokenService,
      configService,
      jobLeaseService,
      reminderDeliveryRepo,
    );
  });

  const createMockAppointment = (overrides: {
    id: number;
    scheduleDate: Date;
    startTime: Date;
    timezone?: string;
    confirmedAt?: Date | null;
    email?: string;
    userId?: number;
  }) => ({
    id: overrides.id,
    startTime: overrides.startTime, // 1970 epoch
    endTime: new Date('1970-01-01T10:00:00.000Z'),
    clinicId: 1,
    confirmedAt: overrides.confirmedAt ?? null,
    patient: {
      profile: {
        name: 'Carlos',
        lastName: 'Pérez',
        userId: overrides.userId ?? 55,
        user: overrides.email ? { email: overrides.email } : null,
      },
    },
    schedule: {
      scheduleDate: overrides.scheduleDate, // midnight UTC
      doctor: {
        id: 10,
        profile: { name: 'Dra. María', lastName: 'Gómez' },
        clinic: {
          name: 'Sede Central',
          timezone: overrides.timezone ?? 'America/Lima',
        },
      },
      specialty: { name: 'Cardiología' },
    },
  });

  it('RED->GREEN: procesa recordatorio T24 en la ventana (23h45m, 24h] usando hora local y epoch 1970', async () => {
    // now: 2026-10-10 10:00:00 UTC
    // En Lima (UTC-5), si la cita es 2026-10-11 a las 05:00 local (10:00 UTC), delta = exactly 24h -> T24
    const now = new Date('2026-10-10T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockAppt = createMockAppointment({
      id: 101,
      scheduleDate: new Date('2026-10-11T00:00:00.000Z'),
      startTime: new Date('1970-01-01T05:00:00.000Z'), // 05:00 Lima = 10:00 UTC
      timezone: 'America/Lima',
      email: 'carlos@example.com',
      userId: 55,
    });

    appointmentsFindMany.mockResolvedValue([mockAppt]);

    await service.sendReminders();

    expect(reminderDeliveryRepo.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 101,
        kind: ReminderKind.T24,
        channel: 'EMAIL',
      }),
    );
    expect(mailSend).toHaveBeenCalledTimes(1);
    expect(reminderDeliveryRepo.markSent).toHaveBeenCalledWith(
      99,
      'token-99',
      expect.any(Date),
    );
    expect(appointmentsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 101 },
        data: expect.objectContaining({ reminderSent: true }),
      }),
    );

    jest.useRealTimers();
  });

  it('RED->GREEN: procesa recordatorio urgente T2 en la ventana (1h45m, 2h] y marca isAtRisk=true', async () => {
    // now: 2026-10-10 10:00:00 UTC
    // En Lima (UTC-5), si la cita es hoy 2026-10-10 a las 07:00 local (12:00 UTC), delta = 2h -> T2
    const now = new Date('2026-10-10T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockAppt = createMockAppointment({
      id: 202,
      scheduleDate: new Date('2026-10-10T00:00:00.000Z'),
      startTime: new Date('1970-01-01T07:00:00.000Z'), // 07:00 Lima = 12:00 UTC (delta = 2h)
      timezone: 'America/Lima',
      confirmedAt: null,
      email: 'lucia@example.com',
      userId: 77,
    });

    appointmentsFindMany.mockResolvedValue([mockAppt]);

    await service.sendReminders();

    expect(reminderDeliveryRepo.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 202,
        kind: ReminderKind.T2,
        channel: 'EMAIL',
      }),
    );
    expect(appointmentsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 202 },
        data: expect.objectContaining({ reminderSent: true, isAtRisk: true }),
      }),
    );

    jest.useRealTimers();
  });

  it('frontera: delta de 2h nunca es entregado como T24 (ventanas disjuntas)', async () => {
    const now = new Date('2026-10-10T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockAppt = createMockAppointment({
      id: 202,
      scheduleDate: new Date('2026-10-10T00:00:00.000Z'),
      startTime: new Date('1970-01-01T07:00:00.000Z'), // delta = 2h
      timezone: 'America/Lima',
      confirmedAt: null,
      email: 'lucia@example.com',
    });

    appointmentsFindMany.mockResolvedValue([mockAppt]);

    await service.sendReminders();

    const claimCalls = reminderDeliveryRepo.claim.mock.calls;
    const t24Claims = claimCalls.filter(
      ([arg]) => arg.kind === ReminderKind.T24,
    );
    expect(t24Claims).toHaveLength(0);

    jest.useRealTimers();
  });

  it('frontera: Madrid y Lima con misma hora nominal 10:00 calculan instantes UTC distintos', async () => {
    // now: 2026-07-10 08:00:00 UTC
    // Madrid en julio está en CEST (UTC+2) -> 10:00 local = 08:00 UTC (delta = 0h, no en ventana)
    // Cita Madrid mañana a las 10:00 local: 2026-07-11 10:00 local = 08:00 UTC -> delta = exactly 24h -> T24
    const now = new Date('2026-07-10T08:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockMadridAppt = createMockAppointment({
      id: 301,
      scheduleDate: new Date('2026-07-11T00:00:00.000Z'),
      startTime: new Date('1970-01-01T10:00:00.000Z'), // 10:00 Madrid = 08:00 UTC (delta 24h)
      timezone: 'Europe/Madrid',
      email: 'madrid@example.com',
    });

    const mockLimaAppt = createMockAppointment({
      id: 302,
      scheduleDate: new Date('2026-07-11T00:00:00.000Z'),
      startTime: new Date('1970-01-01T10:00:00.000Z'), // 10:00 Lima = 15:00 UTC (delta 31h, fuera de ventana)
      timezone: 'America/Lima',
      email: 'lima@example.com',
    });

    appointmentsFindMany.mockResolvedValue([mockMadridAppt, mockLimaAppt]);

    await service.sendReminders();

    // Solo Madrid entra en T24
    expect(reminderDeliveryRepo.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 301,
        kind: ReminderKind.T24,
      }),
    );
    expect(reminderDeliveryRepo.claim).not.toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 302,
        kind: ReminderKind.T24,
      }),
    );

    jest.useRealTimers();
  });

  it('resiliencia: si mailService.send() retorna false, llama markFailed y NO marca reminderSent', async () => {
    const now = new Date('2026-10-10T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockAppt = createMockAppointment({
      id: 401,
      scheduleDate: new Date('2026-10-11T00:00:00.000Z'),
      startTime: new Date('1970-01-01T05:00:00.000Z'), // delta 24h
      timezone: 'America/Lima',
      email: 'fail@example.com',
      userId: 0, // sin notificacion in_app
    });
    // @ts-expect-error test override
    mockAppt.patient.profile.userId = null;

    appointmentsFindMany.mockResolvedValue([mockAppt]);
    mailSend.mockResolvedValue(false); // SMTP fail

    await service.sendReminders();

    expect(reminderDeliveryRepo.markFailed).toHaveBeenCalledWith(
      99,
      'token-99',
      expect.any(Date),
      'SMTP_FAILED',
    );
    expect(reminderDeliveryRepo.markSent).not.toHaveBeenCalled();
    expect(appointmentsUpdate).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});
