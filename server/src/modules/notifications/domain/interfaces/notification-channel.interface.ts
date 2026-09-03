export type NotificationChannelType =
  | 'IN_APP'
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP'
  | 'PUSH';

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsProvider {
  sendSms(to: string, message: string): Promise<SendSmsResult>;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  sendWhatsApp(
    to: string,
    message: string,
    parameters?: Record<string, string>,
  ): Promise<SendWhatsAppResult>;
}

export interface DispatchNotificationOptions {
  userId: number;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  channel: NotificationChannelType;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  enableFallbackToSms?: boolean;
}

export interface DispatchNotificationResult {
  channel: NotificationChannelType;
  delivered: boolean;
  messageId?: string;
  fallbackUsed?: boolean;
  error?: string;
}
