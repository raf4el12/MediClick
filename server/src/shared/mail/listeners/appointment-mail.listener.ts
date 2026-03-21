import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail.service.js';
import { CreateNotificationUseCase } from '../../../modules/notifications/application/use-cases/create-notification.use-case.js';
import type {
  AppointmentConfirmedEvent,
  AppointmentCancelledEvent,
} from '../events/mail-events.interface.js';

@Injectable()
export class AppointmentMailListener {
  private readonly logger = new Logger(AppointmentMailListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('appointment.confirmed')
  async handleConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
    try {
      await Promise.all([
        this.mailService.send({
          to: event.patientEmail,
          subject: 'Tu cita ha sido confirmada — MediClick',
          template: 'appointment-confirmed',
          context: {
            patientName: event.patientName,
            doctorName: event.doctorName,
            specialty: event.specialty,
            clinicName: event.clinicName,
            clinicTimezone: event.clinicTimezone,
            scheduleDate: event.scheduleDate,
            startTime: event.startTime,
            endTime: event.endTime,
          },
        }),
        this.createNotification.execute({
          userId: event.patientUserId,
          type: 'APPOINTMENT_CONFIRMED',
          title: 'Cita confirmada',
          message: `Tu cita con el Dr(a). ${event.doctorName} ha sido confirmada.`,
          metadata: { appointmentId: event.appointmentId },
        }),
      ]);
    } catch (error) {
      this.logger.error(
        `Error procesando appointment.confirmed (id=${event.appointmentId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @OnEvent('appointment.cancelled')
  async handleCancelled(event: AppointmentCancelledEvent): Promise<void> {
    try {
      const clientUrl = this.configService.get<string>(
        'CLIENT_URL',
        'http://localhost:3000',
      );

      await Promise.all([
        this.mailService.send({
          to: event.patientEmail,
          subject: 'Tu cita ha sido cancelada — MediClick',
          template: 'appointment-cancelled',
          context: {
            patientName: event.patientName,
            doctorName: event.doctorName,
            clinicName: event.clinicName,
            clinicTimezone: event.clinicTimezone,
            scheduleDate: event.scheduleDate,
            cancelReason: event.cancelReason,
            clientUrl,
          },
        }),
        this.createNotification.execute({
          userId: event.patientUserId,
          type: 'APPOINTMENT_CANCELLED',
          title: 'Cita cancelada',
          message: `Tu cita con el Dr(a). ${event.doctorName} ha sido cancelada.${
            event.cancelReason ? ` Motivo: ${event.cancelReason}` : ''
          }`,
          metadata: { appointmentId: event.appointmentId },
        }),
      ]);
    } catch (error) {
      this.logger.error(
        `Error procesando appointment.cancelled (id=${event.appointmentId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
