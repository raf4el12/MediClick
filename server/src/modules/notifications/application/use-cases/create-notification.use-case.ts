import { Injectable, Inject, Logger } from '@nestjs/common';
import { CreateNotificationDto } from '../dto/create-notification.dto.js';
import { NotificationResponseDto } from '../dto/notification-response.dto.js';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service.js';
import type { NotificationChannelType } from '../../domain/interfaces/notification-channel.interface.js';

@Injectable()
export class CreateNotificationUseCase {
  private readonly logger = new Logger(CreateNotificationUseCase.name);

  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  async execute(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const channel = (dto.channel ?? 'IN_APP') as NotificationChannelType;

    // Si es un canal externo (SMS, WHATSAPP, EMAIL), despachar a través del dispatcher multicanal
    if (channel === 'SMS' || channel === 'WHATSAPP' || channel === 'EMAIL') {
      await this.dispatcher.dispatch({
        userId: dto.userId,
        recipientPhone: dto.recipientPhone,
        recipientEmail: dto.recipientEmail,
        channel,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata ?? null,
      });
    }

    const notification = await this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type,
      channel: dto.channel,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata ?? null,
      clinicId: dto.clinicId ?? null,
    });

    this.logger.log(
      `[AUDIT] Notification created | id=${notification.id} userId=${dto.userId} type=${dto.type} channel=${dto.channel} title="${dto.title}"`,
    );

    return notification;
  }
}
