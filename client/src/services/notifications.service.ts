import { api } from '@/libs/axios';
import type {
    Notification,
    PaginatedNotifications,
    NotificationQueryParams,
    UnreadCountResponse,
    MarkAllReadResponse,
} from '@/views/notifications/types';

export const notificationsService = {
    getMyNotifications: async (
        params?: NotificationQueryParams,
    ): Promise<PaginatedNotifications> => {
        const response = await api.get<PaginatedNotifications>('/notifications', {
            params,
        });
        return response.data;
    },

    getUnreadCount: async (): Promise<UnreadCountResponse> => {
        const response = await api.get<UnreadCountResponse>(
            '/notifications/unread-count',
        );
        return response.data;
    },

    markAsRead: async (id: number): Promise<Notification> => {
        const response = await api.patch<Notification>(
            `/notifications/${id}/read`,
        );
        return response.data;
    },

    markAllAsRead: async (): Promise<MarkAllReadResponse> => {
        const response = await api.patch<MarkAllReadResponse>(
            '/notifications/read-all',
        );
        return response.data;
    },

    deleteNotification: async (id: number): Promise<void> => {
        await api.delete(`/notifications/${id}`);
    },
};
