import { Injectable, Inject } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';

@Injectable()
export class MarkAllReadUseCase {
    constructor(
        @Inject('INotificationRepository')
        private readonly notificationRepository: INotificationRepository,
    ) { }

    async execute(userId: number): Promise<{ markedCount: number }> {
        const count = await this.notificationRepository.markAllAsRead(userId);
        return { markedCount: count };
    }
}
