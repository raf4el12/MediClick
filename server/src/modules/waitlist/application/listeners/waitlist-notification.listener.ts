import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../../shared/mail/mail.service.js';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';
import type {
  WaitlistOfferCreatedEvent,
  WaitlistOfferAcceptedEvent,
} from '../events/waitlist-events.interface.js';

@Injectable()
export class WaitlistNotificationListener {
  private readonly logger = new Logger(WaitlistNotificationListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('waitlist.offer.created')
  async handleOfferCreated(event: WaitlistOfferCreatedEvent): Promise<void> {
    // La notificación in-app es el canal crítico: se envía siempre que haya usuario.
    if (event.patientUserId) {
      try {
        await this.createNotification.execute({
          userId: event.patientUserId,
          type: 'GENERAL',
          title: 'Cupo disponible',
          message: `Se liberó un cupo con el Dr(a). ${event.doctorName} (${event.specialtyName}). Acéptalo antes de que expire.`,
          metadata: { offerId: event.offerId, scheduleDate: event.scheduleDate },
          clinicId: event.clinicId,
        });
      } catch (error) {
        this.logger.error(
          `[WAITLIST] Error creando notificación in-app (offer=${event.offerId}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // El email es best-effort: un fallo de plantilla/SMTP no debe romper el flujo.
    if (event.patientEmail) {
      try {
        const clientUrl = this.configService.get<string>(
          'CLIENT_URL',
          'http://localhost:3000',
        );
        await this.mailService.send({
          to: event.patientEmail,
          subject: '¡Se liberó un cupo! — MediClick',
          template: 'waitlist-offer',
          context: {
            patientName: event.patientName,
            doctorName: event.doctorName,
            specialtyName: event.specialtyName,
            clinicTimezone: event.clinicTimezone,
            scheduleDate: event.scheduleDate,
            startTime: event.startTime,
            endTime: event.endTime,
            expiresAt: event.expiresAt,
            clientUrl,
          },
        });
      } catch (error) {
        this.logger.error(
          `[WAITLIST] Error enviando email de oferta (offer=${event.offerId}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  @OnEvent('waitlist.offer.accepted')
  async handleOfferAccepted(event: WaitlistOfferAcceptedEvent): Promise<void> {
    if (!event.patientUserId) return;
    try {
      await this.createNotification.execute({
        userId: event.patientUserId,
        type: 'GENERAL',
        title: 'Cupo reservado',
        message: `Reservaste el cupo con el Dr(a). ${event.doctorName}. Completa el pago para confirmar tu cita.`,
        metadata: { appointmentId: event.appointmentId, offerId: event.offerId },
        clinicId: event.clinicId,
      });
    } catch (error) {
      this.logger.error(
        `[WAITLIST] Error notificando aceptación (offer=${event.offerId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
