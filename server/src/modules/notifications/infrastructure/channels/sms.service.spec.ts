/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@nestjs/common';
import { SmsService } from './sms.service.js';
import { ConfigService } from '@nestjs/config';

describe('SmsService (Twilio / Simulator Provider)', () => {
  let service: SmsService;
  let configService: jest.Mocked<ConfigService>;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('RED->GREEN: en modo simulador (sin credenciales Twilio) envía exitosamente con messageId simulado y no loguea PII', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    });
    service = new SmsService(configService);

    const result = await service.sendSms(
      '+51999888777',
      'Tu cita médica secreta está confirmada.',
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('sms_sim_');

    const allLogs = [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]
      .flat()
      .join(' ');
    expect(allLogs).not.toContain('+51999888777');
    expect(allLogs).not.toContain('Tu cita médica secreta');
  });

  it('RED->GREEN: en producción falla closed si faltan credenciales Twilio y no loguea PII', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });
    service = new SmsService(configService);

    const result = await service.sendSms(
      '+51999888777',
      'Tu cita médica secreta está confirmada.',
    );

    expect(result).toEqual({
      success: false,
      error: 'PROVIDER_NOT_CONFIGURED',
    });

    const allLogs = [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]
      .flat()
      .join(' ');
    expect(allLogs).not.toContain('+51999888777');
    expect(allLogs).not.toContain('Tu cita médica secreta');
  });

  it('RED->GREEN: rechaza envío si el número de teléfono es inválido o vacío', async () => {
    configService.get.mockReturnValue(undefined);
    service = new SmsService(configService);

    const result = await service.sendSms('', 'Mensaje de prueba');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Número de teléfono inválido');
  });
});
