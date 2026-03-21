import {
  CreateNotificationData,
  NotificationResult,
  NotificationFilters,
  PaginatedNotifications,
} from '../interfaces/notification-data.interface.js';

export interface INotificationRepository {
  create(data: CreateNotificationData): Promise<NotificationResult>;
  findByUserId(
    userId: number,
    filters: NotificationFilters,
  ): Promise<PaginatedNotifications>;
  findById(id: number): Promise<NotificationResult | null>;
  markAsRead(id: number): Promise<NotificationResult>;
  markAllAsRead(userId: number): Promise<number>;
  countUnread(userId: number): Promise<number>;
  softDelete(id: number): Promise<void>;
}
