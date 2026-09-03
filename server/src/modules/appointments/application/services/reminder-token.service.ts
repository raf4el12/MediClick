import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum ReminderAction {
  CONFIRM = 'CONFIRM',
  CANCEL = 'CANCEL',
}

export interface ReminderTokenPayload {
  appointmentId: number;
  action: ReminderAction;
  exp: number; // Unix timestamp en segundos
}

@Injectable()
export class ReminderTokenService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('REMINDER_SECRET') ??
      this.configService.get<string>('JWT_SECRET') ??
      'mediclick-default-reminder-secret-do-not-use-in-production';
  }

  /**
   * Genera un token firmado HMAC-SHA256 con payload codificado en base64url.
   * Formato: `<payloadBase64>.<signatureBase64>`
   */
  generateToken(
    appointmentId: number,
    action: ReminderAction,
    ttlSeconds: number = 86_400, // 24h por defecto
  ): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload: ReminderTokenPayload = {
      appointmentId,
      action,
      exp,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const signature = this.sign(payloadBase64);

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Valida la firma criptográfica y el tiempo de expiración del token.
   * Devuelve el payload verificado o lanza BadRequestException.
   */
  verifyToken(token: string): ReminderTokenPayload {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Token de recordatorio ausente');
    }

    const parts = token.trim().split('.');
    if (parts.length !== 2) {
      throw new BadRequestException(
        'Formato de token de recordatorio inválido',
      );
    }

    const [payloadBase64, signature] = parts;
    const expectedSignature = this.sign(payloadBase64);

    const sigBuf = Buffer.from(signature, 'base64url');
    const expectedBuf = Buffer.from(expectedSignature, 'base64url');

    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      throw new BadRequestException('Firma de token de recordatorio inválida');
    }

    let payload: ReminderTokenPayload;
    try {
      const json = Buffer.from(payloadBase64, 'base64url').toString('utf8');
      payload = JSON.parse(json) as ReminderTokenPayload;
    } catch {
      throw new BadRequestException('Cuerpo de token corrupto o mal formado');
    }

    if (
      !payload.appointmentId ||
      typeof payload.appointmentId !== 'number' ||
      !Object.values(ReminderAction).includes(payload.action) ||
      !payload.exp ||
      typeof payload.exp !== 'number'
    ) {
      throw new BadRequestException(
        'Datos de token de recordatorio incompletos',
      );
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds > payload.exp) {
      throw new BadRequestException(
        'El enlace del recordatorio ha expirado. Por favor ingresa a la plataforma para gestionar tu cita.',
      );
    }

    return payload;
  }

  private sign(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
