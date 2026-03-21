import { Injectable, Inject } from '@nestjs/common';
import { CreateNotificationDto } from '../dto/create-notification.dto.js';
import { NotificationResponseDto } from '../dto/notification-response.dto.js';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    return this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type,
      channel: dto.channel,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata,
    });
  }
}
