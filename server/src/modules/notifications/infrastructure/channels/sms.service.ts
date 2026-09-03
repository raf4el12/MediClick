import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISmsProvider,
  SendSmsResult,
} from '../../domain/interfaces/notification-channel.interface.js';

@Injectable()
export class SmsService implements ISmsProvider {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid?: string;
  private readonly authToken?: string;
  private readonly fromNumber?: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    const cleanTo = to?.trim();
    if (!cleanTo || cleanTo.length < 6) {
      return {
        success: false,
        error: 'Número de teléfono inválido o vacío para envío SMS',
      };
    }

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      if (this.isProduction) {
        this.logger.error('[SMS] PROVIDER_NOT_CONFIGURED');
        return {
          success: false,
          error: 'PROVIDER_NOT_CONFIGURED',
        };
      }

      // Modo Simulador para entornos de desarrollo y pruebas sin Twilio provisionado
      const simulatedId = `sms_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.logger.log(
        `[SMS-SIMULATOR] SMS simulado exitosamente | ID=${simulatedId}`,
      );
      return {
        success: true,
        messageId: simulatedId,
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        'base64',
      );

      const body = new URLSearchParams({
        To: cleanTo,
        From: this.fromNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await response.json()) as {
        sid?: string;
        message?: string;
      };
      if (!response.ok) {
        this.logger.error(
          `[TWILIO] Error al enviar SMS: status=${response.status} ${data.message || response.statusText}`,
        );
        return {
          success: false,
          error: data.message || response.statusText,
        };
      }

      this.logger.log(`[TWILIO] SMS enviado exitosamente | SID=${data.sid}`);
      return {
        success: true,
        messageId: data.sid,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[TWILIO] Excepción enviando SMS: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
