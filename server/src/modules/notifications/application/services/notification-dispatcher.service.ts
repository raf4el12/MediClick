import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  ISmsProvider,
  IWhatsAppProvider,
  DispatchNotificationOptions,
  DispatchNotificationResult,
} from '../../domain/interfaces/notification-channel.interface.js';
import { MailService } from '../../../../shared/mail/mail.service.js';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    @Inject('ISmsProvider')
    private readonly smsProvider: ISmsProvider,
    @Inject('IWhatsAppProvider')
    private readonly whatsAppProvider: IWhatsAppProvider,
    private readonly mailService: MailService,
  ) {}

  async dispatch(
    options: DispatchNotificationOptions,
  ): Promise<DispatchNotificationResult> {
    const {
      recipientPhone,
      recipientEmail,
      channel,
      title,
      message,
      metadata: _metadata,
      enableFallbackToSms = true,
    } = options;

    // 1. Canal WHATSAPP
    if (channel === 'WHATSAPP') {
      if (recipientPhone) {
        const wppResult = await this.whatsAppProvider.sendWhatsApp(
          recipientPhone,
          message,
        );
        if (wppResult.success) {
          return {
            channel: 'WHATSAPP',
            delivered: true,
            messageId: wppResult.messageId,
          };
        }

        this.logger.warn(
          `[DISPATCHER] Falló envío WhatsApp. ${enableFallbackToSms ? 'Intentando fallback SMS...' : ''}`,
        );

        if (enableFallbackToSms) {
          const smsFallbackResult = await this.smsProvider.sendSms(
            recipientPhone,
            message,
          );
          if (smsFallbackResult.success) {
            return {
              channel: 'SMS',
              delivered: true,
              messageId: smsFallbackResult.messageId,
              fallbackUsed: true,
            };
          }
        }

        return {
          channel: 'WHATSAPP',
          delivered: false,
          error: wppResult.error,
        };
      }
    }

    // 2. Canal SMS
    if (channel === 'SMS') {
      if (recipientPhone) {
        const smsResult = await this.smsProvider.sendSms(
          recipientPhone,
          message,
        );
        if (smsResult.success) {
          return {
            channel: 'SMS',
            delivered: true,
            messageId: smsResult.messageId,
          };
        }
        return {
          channel: 'SMS',
          delivered: false,
          error: smsResult.error,
        };
      }
    }

    // 3. Canal EMAIL
    if (channel === 'EMAIL') {
      if (recipientEmail) {
        const mailSent = await this.mailService.send({
          to: recipientEmail,
          subject: title,
          template: 'general-notification',
          context: {
            title,
            message,
            ..._metadata,
          },
        });
        return {
          channel: 'EMAIL',
          delivered: mailSent,
        };
      }
    }

    // 4. Canal IN_APP (default o base)
    return {
      channel: 'IN_APP',
      delivered: true,
    };
  }
}
