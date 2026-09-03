import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
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

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly reminderTokenService: ReminderTokenService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Se ejecuta periódicamente cada 15 minutos para evaluar citas que entran
   * en las ventanas T-24h y T-2h de forma continua, precisa e idempotente.
   */
  @Cron('*/15 * * * *')
  async sendReminders(): Promise<void> {
    const now = new Date();
    await this.processT24Reminders(now);
    await this.processT2Reminders(now);
  }

  /**
   * T-24h: Envía recordatorio preventivo con 24 horas de antelación
   * para citas confirmadas que aún no tienen recordatorio T24 registrado.
   */
  private async processT24Reminders(now: Date): Promise<void> {
    const maxT24 = new Date(now.getTime() + 25 * 3600 * 1000);

    const appointments = await this.prisma.appointments.findMany({
      where: {
        status: 'CONFIRMED',
        deleted: false,
        startTime: {
          gte: now,
          lte: maxT24,
        },
        reminders: {
          none: { kind: 'T24' },
        },
      },
      include: reminderAppointmentInclude,
    });

    for (const appt of appointments) {
      await this.deliverReminder(appt, 'T24', false);
    }
  }

  /**
   * T-2h: Envía recordatorio urgente con 2 horas de antelación para citas
   * confirmadas que NO hayan confirmado asistencia aún (confirmedAt = null).
   * Marca además la cita con isAtRisk = true para alertar a recepción.
   */
  private async processT2Reminders(now: Date): Promise<void> {
    const maxT2 = new Date(now.getTime() + 2.5 * 3600 * 1000);

    const appointments = await this.prisma.appointments.findMany({
      where: {
        status: 'CONFIRMED',
        deleted: false,
        confirmedAt: null,
        startTime: {
          gte: now,
          lte: maxT2,
        },
        reminders: {
          none: { kind: 'T2' },
        },
      },
      include: reminderAppointmentInclude,
    });

    for (const appt of appointments) {
      await this.deliverReminder(appt, 'T2', true);
    }
  }

  private async deliverReminder(
    appt: ReminderAppointment,
    kind: 'T24' | 'T2',
    isUrgent: boolean,
  ): Promise<void> {
    try {
      await this.prisma.appointmentReminders.create({
        data: {
          appointmentId: appt.id,
          kind,
          channel: 'EMAIL',
        },
      });
    } catch (error: unknown) {
      const isUniqueConstraint =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002';

      if (isUniqueConstraint) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error registrando recordatorio ${kind} para cita ${appt.id}: ${message}`,
      );
      return;
    }

    try {
      const patientName = `${appt.patient.profile.name} ${appt.patient.profile.lastName}`;
      const doctorName = `${appt.schedule.doctor.profile.name} ${appt.schedule.doctor.profile.lastName}`;
      const clinicName =
        appt.schedule.doctor.clinic?.name ?? DEFAULT_CLINIC_NAME;
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
        this.configService.get<string>('BACKEND_URL') ??
        'http://localhost:5100';
      const confirmUrl = `${backendUrl}/appointments/actions/respond?token=${confirmToken}`;
      const cancelUrl = `${backendUrl}/appointments/actions/respond?token=${cancelToken}`;

      if (recipientEmail) {
        await this.mailService.send({
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
        });
      }

      if (patientUserId) {
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
      }

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Fallo al enviar recordatorio ${kind} para cita ${appt.id}: ${message}`,
      );
    }
  }
}
