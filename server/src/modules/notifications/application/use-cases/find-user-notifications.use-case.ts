import { Injectable, Inject } from '@nestjs/common';
import { NotificationQueryDto } from '../dto/notification-query.dto.js';
import { PaginatedNotificationsResponseDto } from '../dto/notification-response.dto.js';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';

@Injectable()
export class FindUserNotificationsUseCase {
    constructor(
        @Inject('INotificationRepository')
        private readonly notificationRepository: INotificationRepository,
    ) { }

    async execute(
        userId: number,
        query: NotificationQueryDto,
    ): Promise<PaginatedNotificationsResponseDto> {
        return this.notificationRepository.findByUserId(userId, {
            isRead: query.isRead,
            type: query.type,
            page: query.page,
            limit: query.limit,
        });
    }
}
