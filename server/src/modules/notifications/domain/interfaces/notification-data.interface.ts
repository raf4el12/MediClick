export interface CreateNotificationData {
    userId: number;
    type: string;
    channel?: string;
    title: string;
    message: string;
    metadata?: any;
}

export interface NotificationFilters {
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
}

export interface NotificationResult {
    id: number;
    userId: number;
    type: string;
    channel: string;
    title: string;
    message: string;
    isRead: boolean;
    metadata: any;
    sentAt: Date | null;
    createdAt: Date;
}

export interface PaginatedNotifications {
    data: NotificationResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
