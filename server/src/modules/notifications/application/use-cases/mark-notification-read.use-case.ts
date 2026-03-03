import {
    Injectable,
    Inject,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { NotificationResponseDto } from '../dto/notification-response.dto.js';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';

@Injectable()
export class MarkNotificationReadUseCase {
    constructor(
        @Inject('INotificationRepository')
        private readonly notificationRepository: INotificationRepository,
    ) { }

    async execute(
        userId: number,
        notificationId: number,
    ): Promise<NotificationResponseDto> {
        const notification =
            await this.notificationRepository.findById(notificationId);

        if (!notification) {
            throw new NotFoundException('Notificación no encontrada');
        }

        if (notification.userId !== userId) {
            throw new ForbiddenException(
                'No tiene permiso para modificar esta notificación',
            );
        }

        return this.notificationRepository.markAsRead(notificationId);
    }
}
