import {
    Injectable,
    Inject,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';

@Injectable()
export class DeleteNotificationUseCase {
    constructor(
        @Inject('INotificationRepository')
        private readonly notificationRepository: INotificationRepository,
    ) { }

    async execute(userId: number, notificationId: number): Promise<void> {
        const notification =
            await this.notificationRepository.findById(notificationId);

        if (!notification) {
            throw new NotFoundException('Notificación no encontrada');
        }

        if (notification.userId !== userId) {
            throw new ForbiddenException(
                'No tiene permiso para eliminar esta notificación',
            );
        }

        await this.notificationRepository.softDelete(notificationId);
    }
}
