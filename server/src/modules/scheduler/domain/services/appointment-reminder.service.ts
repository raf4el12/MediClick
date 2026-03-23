import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { MailService } from '../../../../shared/mail/mail.service.js';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import { todayStartInTimezone } from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Lima' })
  async sendReminders(): Promise<void> {
    this.logger.log('Iniciando envio de recordatorios de citas...');

    const todayStart = todayStartInTimezone('America/Lima');
    const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86_400_000);

    const appointments = await this.prisma.appointments.findMany({
      where: {
        status: 'CONFIRMED',
        deleted: false,
        reminderSent: false,
        schedule: {
          scheduleDate: {
            gte: tomorrowStart,
            lt: tomorrowEnd,
          },
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            profile: {
              select: {
                name: true,
                lastName: true,
                email: true,
                userId: true,
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
      },
    });

    if (appointments.length === 0) {
      this.logger.log('No hay citas para recordar manana.');
      return;
    }

    let sent = 0;

    for (const appt of appointments) {
      try {
        const patientName = `${appt.patient.profile.name} ${appt.patient.profile.lastName}`;
        const doctorName = `${appt.schedule.doctor.profile.name} ${appt.schedule.doctor.profile.lastName}`;
        const clinicName = appt.schedule.doctor.clinic?.name ?? 'MediClick';
        const clinicTimezone =
          appt.schedule.doctor.clinic?.timezone ?? 'America/Lima';
        const patientUserId = appt.patient.profile.userId;

        await this.mailService.send({
          to: appt.patient.profile.email,
          subject: 'Recordatorio: Tu cita es manana — MediClick',
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
          },
        });

        if (patientUserId) {
          await this.createNotification.execute({
            userId: patientUserId,
            type: 'APPOINTMENT_REMINDER',
            title: 'Recordatorio de cita',
            message: `Tu cita con el Dr(a). ${doctorName} es manana.`,
            metadata: { appointmentId: appt.id },
          });
        }

        await this.prisma.appointments.update({
          where: { id: appt.id },
          data: { reminderSent: true },
        });

        sent++;
      } catch (error) {
        this.logger.error(
          `Error enviando recordatorio para cita ${appt.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Recordatorios enviados: ${sent} de ${appointments.length}`,
    );
  }
}
