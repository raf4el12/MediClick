import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service.js';
import { CreateNotificationUseCase } from '../../../modules/notifications/application/use-cases/create-notification.use-case.js';
import type { PrescriptionCreatedEvent } from '../events/mail-events.interface.js';

@Injectable()
export class PrescriptionMailListener {
  private readonly logger = new Logger(PrescriptionMailListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  @OnEvent('prescription.created')
  async handleCreated(event: PrescriptionCreatedEvent): Promise<void> {
    try {
      await Promise.all([
        this.mailService.send({
          to: event.patientEmail,
          subject: 'Nueva receta medica — MediClick',
          template: 'prescription-created',
          context: {
            patientName: event.patientName,
            doctorName: event.doctorName,
            clinicName: event.clinicName,
            clinicTimezone: event.clinicTimezone,
            medications: event.medications,
            instructions: event.instructions,
          },
        }),
        this.createNotification.execute({
          userId: event.patientUserId,
          type: 'PRESCRIPTION_CREATED',
          title: 'Nueva receta medica',
          message: `El Dr(a). ${event.doctorName} te ha generado una receta medica.`,
          metadata: { prescriptionId: event.prescriptionId },
        }),
      ]);
    } catch (error) {
      this.logger.error(
        `Error procesando prescription.created (id=${event.prescriptionId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
