/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service.js';
import { ConfigService } from '@nestjs/config';

describe('WhatsAppService (Meta Cloud API / Simulator Provider)', () => {
  let service: WhatsAppService;
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

  it('RED->GREEN: en modo simulador (sin token Meta) envía exitosamente con messageId simulado y no loguea PII', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    });
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp(
      '+51999888777',
      'Tu cita médica secreta está lista.',
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('wpp_sim_');

    const allLogs = [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]
      .flat()
      .join(' ');
    expect(allLogs).not.toContain('+51999888777');
    expect(allLogs).not.toContain('51999888777');
    expect(allLogs).not.toContain('Tu cita médica secreta');
  });

  it('RED->GREEN: en producción falla closed si faltan credenciales Meta y no loguea PII', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp(
      '+51999888777',
      'Tu cita médica secreta está lista.',
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
    expect(allLogs).not.toContain('51999888777');
    expect(allLogs).not.toContain('Tu cita médica secreta');
  });

  it('RED->GREEN: rechaza envío si el número de teléfono es inválido o vacío', async () => {
    configService.get.mockReturnValue(undefined);
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp('', 'Mensaje de prueba');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Número de teléfono inválido');
  });
});
