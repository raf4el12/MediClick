import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface CheckInQrPayload {
  appointmentId: number;
  patientId: number;
  clinicId?: number | null;
  exp: number; // Unix timestamp en segundos
}

export interface ValidateQrResult {
  valid: boolean;
  payload?: CheckInQrPayload;
  error?: string;
}

@Injectable()
export class AppointmentQrService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('QR_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'mediclick-default-qr-hmac-secret-safety-key';
  }

  /**
   * Genera un token QR firmado criptográficamente para auto-checkin.
   */
  generateCheckInQrToken(appointment: {
    id: number;
    patientId: number;
    clinicId?: number | null;
    scheduleDate: Date;
    startTime: Date;
  }): string {
    const expDate = new Date(appointment.scheduleDate);
    expDate.setHours(23, 59, 59, 999);
    const exp = Math.floor(expDate.getTime() / 1000) + 4 * 3600;

    const payload: CheckInQrPayload = {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      clinicId: appointment.clinicId ?? null,
      exp,
    };

    return this.signPayload(payload);
  }

  /**
   * Valida la firma criptográfica y expiración de un token QR.
   */
  validateCheckInQrToken(token: string): ValidateQrResult {
    if (!token || !token.startsWith('mc_qr_')) {
      return {
        valid: false,
        error: 'Formato de token QR inválido',
      };
    }

    const withoutPrefix = token.substring(6);
    const parts = withoutPrefix.split('.');
    if (parts.length !== 2) {
      return {
        valid: false,
        error: 'Estructura de token QR corrupta',
      };
    }

    const [encodedPayload, receivedHmac] = parts;

    // Verificar HMAC
    const expectedHmac = crypto
      .createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('hex');

    try {
      const receivedBuf = Buffer.from(receivedHmac, 'hex');
      const expectedBuf = Buffer.from(expectedHmac, 'hex');

      if (
        receivedBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(receivedBuf, expectedBuf)
      ) {
        return {
          valid: false,
          error: 'Firma criptográfica inválida en token QR',
        };
      }
    } catch {
      return {
        valid: false,
        error: 'Firma criptográfica inválida en token QR',
      };
    }

    try {
      const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const payload = JSON.parse(jsonStr) as CheckInQrPayload;

      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSec) {
        return {
          valid: false,
          error: 'Token QR expirado para esta cita médica',
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch {
      return {
        valid: false,
        error: 'Error al decodificar payload de token QR',
      };
    }
  }

  protected signPayload(payload: CheckInQrPayload): string {
    const jsonStr = JSON.stringify(payload);
    const encoded = Buffer.from(jsonStr, 'utf8').toString('base64url');
    const hmac = crypto
      .createHmac('sha256', this.secret)
      .update(encoded)
      .digest('hex');
    return `mc_qr_${encoded}.${hmac}`;
  }
}
