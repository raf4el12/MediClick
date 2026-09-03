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

export type WhatsAppContent =
  | {
      kind: 'TEMPLATE';
      name: string;
      languageCode: string;
      bodyParameters: string[];
    }
  | {
      kind: 'SESSION_TEXT';
      body: string;
    };

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  sendWhatsApp(
    to: string,
    content: WhatsAppContent,
  ): Promise<SendWhatsAppResult>;
}

export interface DispatchNotificationOptions {
  userId: number;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  channel: NotificationChannelType;
  title: string;
  message: string;
  whatsAppContent?: WhatsAppContent;
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
