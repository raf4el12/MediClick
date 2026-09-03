import {
  Injectable,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
    const requestedChannel = (dto.channel ??
      'IN_APP') as NotificationChannelType;

    let finalChannel = requestedChannel;
    let providerMetadata: Record<string, unknown> = {};

    // Si es un canal externo (SMS, WHATSAPP, EMAIL), despachar a través del dispatcher multicanal
    if (
      requestedChannel === 'SMS' ||
      requestedChannel === 'WHATSAPP' ||
      requestedChannel === 'EMAIL'
    ) {
      const result = await this.dispatcher.dispatch({
        userId: dto.userId,
        recipientPhone: dto.recipientPhone,
        recipientEmail: dto.recipientEmail,
        channel: requestedChannel,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata ?? null,
      });

      if (!result.delivered) {
        throw new ServiceUnavailableException(
          `No se pudo entregar la notificación por el canal ${requestedChannel}: ${result.error ?? 'Error del proveedor'}`,
        );
      }

      finalChannel = result.channel;
      providerMetadata = {
        ...(result.messageId && { messageId: result.messageId }),
        ...(result.fallbackUsed && { fallbackFrom: requestedChannel }),
      };
    }

    const notification = await this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type,
      channel: finalChannel,
      title: dto.title,
      message: dto.message,
      metadata: {
        ...(dto.metadata ?? {}),
        ...providerMetadata,
      },
      clinicId: dto.clinicId ?? null,
    });

    this.logger.log(
      `[AUDIT] Notification created | id=${notification.id} userId=${dto.userId} type=${dto.type} channel=${finalChannel} title="${dto.title}"`,
    );

    return notification;
  }
}
