import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { TemplateService } from './template.service.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
  ) {
    this.from = this.configService.get<string>(
      'MAIL_FROM',
      'MediClick <noreply@mediclick.com>',
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER', ''),
        pass: this.configService.get<string>('MAIL_PASS', ''),
      },
    });
  }

  /**
   * Envia un email. Nunca lanza excepcion — loguea errores y retorna false.
   * Patron fire-and-forget para no bloquear flujos de negocio.
   */
  async send(options: SendMailOptions): Promise<boolean> {
    try {
      const html = this.templateService.compile(
        options.template,
        options.context,
      );

      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`Email enviado a ${options.to} [${options.template}]`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error enviando email a ${options.to} [${options.template}]: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  /**
   * Verifica la conexion SMTP. Util para health checks.
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Conexion SMTP verificada correctamente');
      return true;
    } catch (error) {
      this.logger.error(
        `Error verificando SMTP: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
