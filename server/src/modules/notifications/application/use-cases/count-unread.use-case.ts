import { Injectable, Inject } from '@nestjs/common';
import { UnreadCountResponseDto } from '../dto/notification-response.dto.js';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';

@Injectable()
export class CountUnreadUseCase {
  constructor(
    @Inject('INotificationRepository')
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(userId: number): Promise<UnreadCountResponseDto> {
    const count = await this.notificationRepository.countUnread(userId);
    return { count };
  }
}
