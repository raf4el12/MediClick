import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { CreateNotificationDto } from '../../application/dto/create-notification.dto.js';
import { NotificationQueryDto } from '../../application/dto/notification-query.dto.js';
import {
    NotificationResponseDto,
    PaginatedNotificationsResponseDto,
    UnreadCountResponseDto,
} from '../../application/dto/notification-response.dto.js';
import { CreateNotificationUseCase } from '../../application/use-cases/create-notification.use-case.js';
import { FindUserNotificationsUseCase } from '../../application/use-cases/find-user-notifications.use-case.js';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read.use-case.js';
import { MarkAllReadUseCase } from '../../application/use-cases/mark-all-read.use-case.js';
import { CountUnreadUseCase } from '../../application/use-cases/count-unread.use-case.js';
import { DeleteNotificationUseCase } from '../../application/use-cases/delete-notification.use-case.js';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
    constructor(
        private readonly createNotificationUseCase: CreateNotificationUseCase,
        private readonly findUserNotificationsUseCase: FindUserNotificationsUseCase,
        private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
        private readonly markAllReadUseCase: MarkAllReadUseCase,
        private readonly countUnreadUseCase: CountUnreadUseCase,
        private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
    ) { }

    @Post()
    @Auth(UserRole.ADMIN)
    @ApiOperation({ summary: 'Crear notificación (admin)' })
    @ApiResponse({
        status: 201,
        description: 'Notificación creada',
        type: NotificationResponseDto,
    })
    async create(
        @Body() dto: CreateNotificationDto,
    ): Promise<NotificationResponseDto> {
        return this.createNotificationUseCase.execute(dto);
    }

    @Get()
    @Auth(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.RECEPTIONIST)
    @ApiOperation({ summary: 'Listar mis notificaciones' })
    @ApiResponse({
        status: 200,
        description: 'Lista paginada de notificaciones',
        type: PaginatedNotificationsResponseDto,
    })
    async findMine(
        @CurrentUser('id') userId: number,
        @Query() query: NotificationQueryDto,
    ): Promise<PaginatedNotificationsResponseDto> {
        return this.findUserNotificationsUseCase.execute(userId, query);
    }

    @Get('unread-count')
    @Auth(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.RECEPTIONIST)
    @ApiOperation({ summary: 'Contar notificaciones no leídas' })
    @ApiResponse({ status: 200, type: UnreadCountResponseDto })
    async countUnread(
        @CurrentUser('id') userId: number,
    ): Promise<UnreadCountResponseDto> {
        return this.countUnreadUseCase.execute(userId);
    }

    @Patch(':id/read')
    @Auth(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.RECEPTIONIST)
    @ApiOperation({ summary: 'Marcar notificación como leída' })
    @ApiResponse({ status: 200, type: NotificationResponseDto })
    @ApiResponse({ status: 403, description: 'No es tu notificación' })
    @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
    async markAsRead(
        @CurrentUser('id') userId: number,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<NotificationResponseDto> {
        return this.markNotificationReadUseCase.execute(userId, id);
    }

    @Patch('read-all')
    @Auth(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.RECEPTIONIST)
    @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
    @ApiResponse({ status: 200, description: 'Cantidad de notificaciones marcadas' })
    async markAllAsRead(
        @CurrentUser('id') userId: number,
    ): Promise<{ markedCount: number }> {
        return this.markAllReadUseCase.execute(userId);
    }

    @Delete(':id')
    @Auth(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.RECEPTIONIST)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar notificación' })
    @ApiResponse({ status: 204, description: 'Notificación eliminada' })
    @ApiResponse({ status: 403, description: 'No es tu notificación' })
    @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
    async remove(
        @CurrentUser('id') userId: number,
        @Param('id', ParseIntPipe) id: number,
    ): Promise<void> {
        return this.deleteNotificationUseCase.execute(userId, id);
    }
}
