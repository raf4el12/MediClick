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

  it('RED->GREEN: en modo simulador envía exitosamente con messageId simulado y no loguea PII', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    });
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp('+51999888777', {
      kind: 'TEMPLATE',
      name: 'appointment_reminder',
      languageCode: 'es_PE',
      bodyParameters: ['Carlos', '10:00'],
    });

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
    expect(allLogs).not.toContain('Carlos');
  });

  it('RED->GREEN: en producción falla closed si faltan credenciales Meta y no loguea PII', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp('+51999888777', {
      kind: 'TEMPLATE',
      name: 'appointment_reminder',
      languageCode: 'es_PE',
      bodyParameters: ['Carlos', '10:00'],
    });

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
    expect(allLogs).not.toContain('Carlos');
  });

  it('RED->GREEN: construye payload exacto de plantilla Meta en producción provisionada', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'WHATSAPP_API_TOKEN') return 'meta_token_123';
      if (key === 'WHATSAPP_PHONE_NUMBER_ID') return 'phone_id_456';
      return undefined;
    });
    service = new WhatsAppService(configService);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'wpp_meta_789' }] }),
    });
    global.fetch = fetchMock;

    const result = await service.sendWhatsApp('+51999888777', {
      kind: 'TEMPLATE',
      name: 'appointment_reminder',
      languageCode: 'es_PE',
      bodyParameters: ['Carlos', '10:00'],
    });

    expect(result).toEqual({
      success: true,
      messageId: 'wpp_meta_789',
    });

    const [, fetchInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(fetchInit.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '51999888777',
      type: 'template',
      template: {
        name: 'appointment_reminder',
        language: { code: 'es_PE' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Carlos' },
              { type: 'text', text: '10:00' },
            ],
          },
        ],
      },
    });
  });

  it('RED->GREEN: construye payload exacto de texto libre cuando kind es SESSION_TEXT', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'WHATSAPP_API_TOKEN') return 'meta_token_123';
      if (key === 'WHATSAPP_PHONE_NUMBER_ID') return 'phone_id_456';
      return undefined;
    });
    service = new WhatsAppService(configService);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'wpp_meta_session_1' }] }),
    });
    global.fetch = fetchMock;

    const result = await service.sendWhatsApp('+51999888777', {
      kind: 'SESSION_TEXT',
      body: 'Hola, atención al cliente.',
    });

    expect(result).toEqual({
      success: true,
      messageId: 'wpp_meta_session_1',
    });

    const [, fetchInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(fetchInit.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '51999888777',
      type: 'text',
      text: { preview_url: false, body: 'Hola, atención al cliente.' },
    });
  });

  it('RED->GREEN: rechaza contenido inválido o sin discriminador de plantilla ni texto de sesión', async () => {
    configService.get.mockReturnValue(undefined);
    service = new WhatsAppService(configService);

    // @ts-expect-error testing invalid discriminator
    const result = await service.sendWhatsApp('+51999888777', {
      kind: 'OTHER',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Contenido WhatsApp inválido');
  });

  it('RED->GREEN: rechaza envío si el número de teléfono es inválido o vacío', async () => {
    configService.get.mockReturnValue(undefined);
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp('', {
      kind: 'SESSION_TEXT',
      body: 'Mensaje de prueba',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Número de teléfono inválido');
  });
});
