import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { INotificationRepository } from '../../domain/repositories/notification.repository.js';
import {
  CreateNotificationData,
  NotificationResult,
  NotificationFilters,
  PaginatedNotifications,
} from '../../domain/interfaces/notification-data.interface.js';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData): Promise<NotificationResult> {
    return this.prisma.notifications.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        channel: (data.channel as any) ?? 'IN_APP',
        title: data.title,
        message: data.message,
        metadata: data.metadata ?? undefined,
        clinicId: data.clinicId ?? null,
      },
    });
  }

  async findByUserId(
    userId: number,
    filters: NotificationFilters,
  ): Promise<PaginatedNotifications> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId, deleted: false };
    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }
    if (filters.type) {
      where.type = filters.type;
    }

    const [data, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number): Promise<NotificationResult | null> {
    return this.prisma.notifications.findFirst({
      where: { id, deleted: false },
    });
  }

  async markAsRead(id: number): Promise<NotificationResult> {
    return this.prisma.notifications.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.prisma.notifications.updateMany({
      where: { userId, isRead: false, deleted: false },
      data: { isRead: true },
    });
    return result.count;
  }

  async countUnread(userId: number): Promise<number> {
    return this.prisma.notifications.count({
      where: { userId, isRead: false, deleted: false },
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.notifications.update({
      where: { id },
      data: { deleted: true },
    });
  }
}
