import { Module } from '@nestjs/common';
import { PrismaNotificationRepository } from '../infrastructure/persistence/prisma-notification.repository.js';
import { CreateNotificationUseCase } from './use-cases/create-notification.use-case.js';
import { FindUserNotificationsUseCase } from './use-cases/find-user-notifications.use-case.js';
import { MarkNotificationReadUseCase } from './use-cases/mark-notification-read.use-case.js';
import { MarkAllReadUseCase } from './use-cases/mark-all-read.use-case.js';
import { CountUnreadUseCase } from './use-cases/count-unread.use-case.js';
import { DeleteNotificationUseCase } from './use-cases/delete-notification.use-case.js';
import { SmsService } from '../infrastructure/channels/sms.service.js';
import { WhatsAppService } from '../infrastructure/channels/whatsapp.service.js';
import { NotificationDispatcherService } from './services/notification-dispatcher.service.js';
import { NotificationController } from '../interfaces/controllers/notification.controller.js';

@Module({
  controllers: [NotificationController],
  providers: [
    {
      provide: 'INotificationRepository',
      useClass: PrismaNotificationRepository,
    },
    {
      provide: 'ISmsProvider',
      useClass: SmsService,
    },
    {
      provide: 'IWhatsAppProvider',
      useClass: WhatsAppService,
    },
    SmsService,
    WhatsAppService,
    NotificationDispatcherService,
    CreateNotificationUseCase,
    FindUserNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllReadUseCase,
    CountUnreadUseCase,
    DeleteNotificationUseCase,
  ],
  exports: [
    CreateNotificationUseCase,
    NotificationDispatcherService,
    'ISmsProvider',
    'IWhatsAppProvider',
    SmsService,
    WhatsAppService,
  ],
})
export class NotificationsModule {}
