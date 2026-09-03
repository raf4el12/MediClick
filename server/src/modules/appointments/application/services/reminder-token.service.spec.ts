import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  ReminderTokenService,
  ReminderAction,
} from './reminder-token.service.js';

describe('ReminderTokenService', () => {
  const secret = 'super-secret-key-for-reminders-12345';
  let service: ReminderTokenService;

  beforeEach(() => {
    const configService = {
      get: (key: string) => (key === 'REMINDER_SECRET' ? secret : undefined),
    } as unknown as ConfigService;
    service = new ReminderTokenService(configService);
  });

  it('RED->GREEN: genera y valida un token de confirmación correctamente', () => {
    const token = service.generateToken(42, ReminderAction.CONFIRM, 3600);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(2);

    const decoded = service.verifyToken(token);
    expect(decoded.appointmentId).toBe(42);
    expect(decoded.action).toBe(ReminderAction.CONFIRM);
  });

  it('RED->GREEN: genera y valida un token de cancelación correctamente', () => {
    const token = service.generateToken(99, ReminderAction.CANCEL, 1800);
    const decoded = service.verifyToken(token);
    expect(decoded.appointmentId).toBe(99);
    expect(decoded.action).toBe(ReminderAction.CANCEL);
  });

  it('rechaza un token manipulado en el payload', () => {
    const token = service.generateToken(42, ReminderAction.CONFIRM, 3600);
    const [payloadBase64, sig] = token.split('.');

    // Modificar payload (cambiar id 42 por 43)
    const rawPayload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8'),
    ) as { appointmentId: number };
    rawPayload.appointmentId = 43;
    const tamperedPayloadBase64 = Buffer.from(
      JSON.stringify(rawPayload),
    ).toString('base64url');
    const tamperedToken = `${tamperedPayloadBase64}.${sig}`;

    expect(() => service.verifyToken(tamperedToken)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un token manipulado en la firma', () => {
    const token = service.generateToken(42, ReminderAction.CONFIRM, 3600);
    const [payload, sig] = token.split('.');
    const tamperedSig = sig.slice(0, -2) + 'aa';
    expect(() => service.verifyToken(`${payload}.${tamperedSig}`)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un token expirado', () => {
    // TTL negativo o 0
    const token = service.generateToken(42, ReminderAction.CONFIRM, -10);
    expect(() => service.verifyToken(token)).toThrow(BadRequestException);
    expect(() => service.verifyToken(token)).toThrow(/expirado/i);
  });

  it('rechaza tokens con formato inválido o campos faltantes', () => {
    expect(() => service.verifyToken('')).toThrow(BadRequestException);
    expect(() => service.verifyToken('invalido-sin-punto')).toThrow(
      BadRequestException,
    );
    expect(() => service.verifyToken('a.b.c')).toThrow(BadRequestException);
  });
});
