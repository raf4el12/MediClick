import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../../modules/notifications/application/notifications.module.js';
import { MailService } from './mail.service.js';
import { TemplateService } from './template.service.js';
import { AppointmentMailListener } from './listeners/appointment-mail.listener.js';
import { PrescriptionMailListener } from './listeners/prescription-mail.listener.js';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [
    TemplateService,
    MailService,
    AppointmentMailListener,
    PrescriptionMailListener,
  ],
  exports: [MailService],
})
export class MailModule {}
