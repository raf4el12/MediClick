export enum NotificationType {
    APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
    APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
    APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
    APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
    NEW_APPOINTMENT = 'NEW_APPOINTMENT',
    GENERAL = 'GENERAL',
}

export enum NotificationChannel {
    IN_APP = 'IN_APP',
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
}

export interface Notification {
    id: number;
    userId: number;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    message: string;
    isRead: boolean;
    metadata: Record<string, unknown> | null;
    sentAt: string | null;
    createdAt: string;
}

export interface PaginatedNotifications {
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface NotificationQueryParams {
    isRead?: boolean;
    type?: NotificationType;
    page?: number;
    limit?: number;
}

export interface UnreadCountResponse {
    count: number;
}

export interface MarkAllReadResponse {
    markedCount: number;
}
