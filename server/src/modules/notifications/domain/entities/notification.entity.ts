export class NotificationEntity {
  id: number;
  userId: number;
  type: string;
  channel: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: any;
  sentAt: Date | null;
  deleted: boolean;
  createdAt: Date;
}
