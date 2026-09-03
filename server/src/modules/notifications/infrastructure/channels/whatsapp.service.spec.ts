import { WhatsAppService } from './whatsapp.service.js';
import { ConfigService } from '@nestjs/config';

describe('WhatsAppService (Meta Cloud API / Simulator Provider)', () => {
  let service: WhatsAppService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  it('RED->GREEN: en modo simulador (sin token Meta) envía exitosamente con messageId simulado', async () => {
    configService.get.mockReturnValue(undefined);
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp(
      '+51999888777',
      'Tu cita médica está lista.',
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('wpp_sim_');
  });

  it('RED->GREEN: rechaza envío si el número de teléfono es inválido o vacío', async () => {
    configService.get.mockReturnValue(undefined);
    service = new WhatsAppService(configService);

    const result = await service.sendWhatsApp('', 'Mensaje de prueba');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Número de teléfono inválido');
  });
});
