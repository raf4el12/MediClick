import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReminderKind } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { MailService } from '../../../../shared/mail/mail.service.js';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import {
  ReminderTokenService,
  ReminderAction,
} from '../../../appointments/application/services/reminder-token.service.js';
import {
  DEFAULT_CLINIC_NAME,
  DEFAULT_TIMEZONE,
} from '../../../../shared/constants/defaults.constant.js';
import { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';
import { logicalWindowId } from '../../../../shared/redis/job-window.js';
import { localDateAndTimeToInstant } from '../../../../shared/utils/date-time.utils.js';
import type { IAppointmentReminderDeliveryRepository } from '../repositories/appointment-reminder-delivery.repository.js';

const reminderAppointmentInclude = {
  patient: {
    select: {
      id: true,
      profile: {
        select: {
          name: true,
          lastName: true,
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  },
  schedule: {
    select: {
      scheduleDate: true,
      doctor: {
        select: {
          id: true,
          profile: { select: { name: true, lastName: true } },
          clinic: { select: { name: true, timezone: true } },
        },
      },
      specialty: { select: { name: true } },
    },
  },
} as const satisfies Prisma.AppointmentsInclude;

type ReminderAppointment = Prisma.AppointmentsGetPayload<{
  include: typeof reminderAppointmentInclude;
}>;

const CRON_INTERVAL_MS = 15 * 60_000;
const T24_TARGET_MS = 24 * 60 * 60 * 1000;
const T2_TARGET_MS = 2 * 60 * 60 * 1000;

const inTargetWindow = (deltaMs: number, targetMs: number) =>
  deltaMs > targetMs - CRON_INTERVAL_MS && deltaMs <= targetMs;

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly reminderTokenService: ReminderTokenService,
    private readonly configService: ConfigService,
    private readonly jobLeaseService: JobLeaseService,
    @Inject('IAppointmentReminderDeliveryRepository')
    private readonly reminderDeliveryRepo: IAppointmentReminderDeliveryRepository,
  ) {}

  /**
   * Se ejecuta periódicamente cada 15 minutos para evaluar citas que entran
   * en las ventanas T-24h y T-2h de forma continua, precisa e idempotente.
   */
  @Cron('*/15 * * * *')
  async sendReminders(): Promise<void> {
    const now = new Date();
    await this.jobLeaseService.withLease(
      'appointment-reminders',
      logicalWindowId(now, 15 * 60_000),
      905,
      async () => {
        await this.processReminders(now);
      },
    );
  }

  /**
   * Evalúa las citas en una sola lectura para asegurar consistencia temporal
   * entre las ventanas disjuntas T-24h y T-2h.
   */
  private async processReminders(now: Date): Promise<void> {
    const minDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
    );
    const maxDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
    );

    const appointments = await this.prisma.appointments.findMany({
      where: {
        status: 'CONFIRMED',
        deleted: false,
        schedule: {
          scheduleDate: {
            gte: minDate,
            lte: maxDate,
          },
        },
      },
      include: reminderAppointmentInclude,
    });

    for (const appt of appointments) {
      const timezone =
        appt.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE;

      let scheduledFor: Date;
      try {
        scheduledFor = localDateAndTimeToInstant(
          appt.schedule.scheduleDate,
          appt.startTime,
          timezone,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Cita ${appt.id} omitida por instante inválido: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        continue;
      }

      const deltaMs = scheduledFor.getTime() - now.getTime();

      let kind: ReminderKind | null = null;
      if (inTargetWindow(deltaMs, T24_TARGET_MS)) {
        kind = ReminderKind.T24;
      } else if (
        inTargetWindow(deltaMs, T2_TARGET_MS) &&
        appt.confirmedAt === null
      ) {
        kind = ReminderKind.T2;
      }

      if (!kind) {
        continue;
      }

      await this.deliverReminder(appt, kind, scheduledFor, now);
    }
  }

  private async deliverReminder(
    appt: ReminderAppointment,
    kind: ReminderKind,
    scheduledFor: Date,
    now: Date,
  ): Promise<void> {
    const isUrgent = kind === ReminderKind.T2;
    const patientName = `${appt.patient.profile.name} ${appt.patient.profile.lastName}`;
    const doctorName = `${appt.schedule.doctor.profile.name} ${appt.schedule.doctor.profile.lastName}`;
    const clinicName = appt.schedule.doctor.clinic?.name ?? DEFAULT_CLINIC_NAME;
    const clinicTimezone =
      appt.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE;
    const patientUserId = appt.patient.profile.userId;
    const recipientEmail = appt.patient.profile.user?.email;

    const confirmToken = this.reminderTokenService.generateToken(
      appt.id,
      ReminderAction.CONFIRM,
      86_400,
    );
    const cancelToken = this.reminderTokenService.generateToken(
      appt.id,
      ReminderAction.CANCEL,
      86_400,
    );

    const backendUrl =
      this.configService.get<string>('BACKEND_URL') ?? 'http://localhost:5100';
    const confirmUrl = `${backendUrl}/appointments/actions/respond?token=${confirmToken}`;
    const cancelUrl = `${backendUrl}/appointments/actions/respond?token=${cancelToken}`;

    let atLeastOneChannelSent = false;

    // 1. Canal EMAIL
    if (recipientEmail) {
      const claim = await this.reminderDeliveryRepo.claim({
        appointmentId: appt.id,
        kind,
        channel: 'EMAIL',
        scheduledFor,
        now,
      });

      if (claim) {
        const messageId = `<appointment-${appt.id}-${kind}-${scheduledFor.getTime()}@mediclick>`;
        try {
          const emailSent = await this.mailService.send({
            to: recipientEmail,
            subject: isUrgent
              ? `⚠️ Recordatorio urgente: Tu cita médica es en 2 horas — ${clinicName}`
              : `Recordatorio: Tu cita médica es mañana — ${clinicName}`,
            template: 'appointment-reminder',
            context: {
              patientName,
              doctorName,
              specialty: appt.schedule.specialty.name,
              clinicName,
              clinicTimezone,
              scheduleDate: appt.schedule.scheduleDate,
              startTime: appt.startTime,
              endTime: appt.endTime,
              isUrgent,
              confirmUrl,
              cancelUrl,
            },
            messageId,
          });

          if (emailSent) {
            await this.reminderDeliveryRepo.markSent(
              claim.id,
              claim.claimToken,
              new Date(),
            );
            atLeastOneChannelSent = true;
          } else {
            const nextAttemptAt = new Date(now.getTime() + 5 * 60_000);
            await this.reminderDeliveryRepo.markFailed(
              claim.id,
              claim.claimToken,
              nextAttemptAt,
              'SMTP_FAILED',
            );
          }
        } catch {
          const nextAttemptAt = new Date(now.getTime() + 5 * 60_000);
          await this.reminderDeliveryRepo.markFailed(
            claim.id,
            claim.claimToken,
            nextAttemptAt,
            'SMTP_ERROR',
          );
        }
      }
    }

    // 2. Canal IN_APP
    if (patientUserId) {
      const claim = await this.reminderDeliveryRepo.claim({
        appointmentId: appt.id,
        kind,
        channel: 'IN_APP',
        scheduledFor,
        now,
      });

      if (claim) {
        try {
          await this.createNotification.execute({
            userId: patientUserId,
            type: 'APPOINTMENT_REMINDER',
            title: isUrgent
              ? 'Recordatorio urgente de cita (2 horas)'
              : 'Recordatorio de cita médica (mañana)',
            message: isUrgent
              ? `Tu cita con el Dr(a). ${doctorName} es en 2 horas. Por favor confirma tu asistencia.`
              : `Tu cita con el Dr(a). ${doctorName} es mañana.`,
            metadata: { appointmentId: appt.id, kind },
            clinicId: appt.clinicId ?? null,
          });
          await this.reminderDeliveryRepo.markSent(
            claim.id,
            claim.claimToken,
            new Date(),
          );
          atLeastOneChannelSent = true;
        } catch {
          const nextAttemptAt = new Date(now.getTime() + 5 * 60_000);
          await this.reminderDeliveryRepo.markFailed(
            claim.id,
            claim.claimToken,
            nextAttemptAt,
            'NOTIFICATION_FAILED',
          );
        }
      }
    }

    // 3. Actualizar estado de la cita si al menos un canal fue exitoso
    if (atLeastOneChannelSent) {
      await this.prisma.appointments.update({
        where: { id: appt.id },
        data: {
          reminderSent: true,
          ...(isUrgent && { isAtRisk: true }),
        },
      });

      this.logger.log(
        `[REMINDER ${kind}] Enviado a cita ${appt.id} (paciente: ${patientName}).`,
      );
    }
  }
}
