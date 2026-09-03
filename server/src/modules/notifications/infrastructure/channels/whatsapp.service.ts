import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWhatsAppProvider,
  SendWhatsAppResult,
  WhatsAppContent,
} from '../../domain/interfaces/notification-channel.interface.js';

@Injectable()
export class WhatsAppService implements IWhatsAppProvider {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiToken?: string;
  private readonly phoneNumberId?: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN');
    this.phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  async sendWhatsApp(
    to: string,
    content: WhatsAppContent,
  ): Promise<SendWhatsAppResult> {
    const cleanTo = to?.trim().replace(/\+/g, '');
    if (!cleanTo || cleanTo.length < 6) {
      return {
        success: false,
        error: 'Número de teléfono inválido o vacío para envío WhatsApp',
      };
    }

    if (
      !content ||
      (content.kind !== 'TEMPLATE' && content.kind !== 'SESSION_TEXT')
    ) {
      return {
        success: false,
        error: 'Contenido WhatsApp inválido o no especificado',
      };
    }

    if (!this.apiToken || !this.phoneNumberId) {
      if (this.isProduction) {
        this.logger.error('[WHATSAPP] PROVIDER_NOT_CONFIGURED');
        return {
          success: false,
          error: 'PROVIDER_NOT_CONFIGURED',
        };
      }

      // Modo Simulador para desarrollo/pruebas locales
      const simulatedId = `wpp_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.logger.log(
        `[WHATSAPP-SIMULATOR] WhatsApp simulado exitosamente | ID=${simulatedId}`,
      );
      return {
        success: true,
        messageId: simulatedId,
      };
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
      let payload: Record<string, unknown>;

      if (content.kind === 'TEMPLATE') {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'template',
          template: {
            name: content.name,
            language: { code: content.languageCode },
            components: [
              {
                type: 'body',
                parameters: content.bodyParameters.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ],
          },
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: { preview_url: false, body: content.body },
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        messages?: Array<{ id: string }>;
        error?: { message: string };
      };

      if (!response.ok || !data.messages?.[0]?.id) {
        const errorMsg =
          data.error?.message || response.statusText || 'Error desconocido';
        this.logger.error(
          `[WHATSAPP-META] Error enviando WhatsApp: status=${response.status} ${errorMsg}`,
        );
        return {
          success: false,
          error: errorMsg,
        };
      }

      const messageId = data.messages[0].id;
      this.logger.log(
        `[WHATSAPP-META] WhatsApp enviado exitosamente | ID=${messageId}`,
      );
      return {
        success: true,
        messageId,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[WHATSAPP-META] Excepción enviando WhatsApp: ${errorMsg}`,
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
