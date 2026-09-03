import { SmsService } from './sms.service.js';
import { ConfigService } from '@nestjs/config';

describe('SmsService (Twilio / Simulator Provider)', () => {
  let service: SmsService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  it('RED->GREEN: en modo simulador (sin credenciales Twilio) envía exitosamente con messageId simulado', async () => {
    configService.get.mockReturnValue(undefined);
    service = new SmsService(configService);

    const result = await service.sendSms(
      '+51999888777',
      'Tu cita médica está confirmada.',
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('sms_sim_');
  });

  it('RED->GREEN: rechaza envío si el número de teléfono es inválido o vacío', async () => {
    configService.get.mockReturnValue(undefined);
    service = new SmsService(configService);

    const result = await service.sendSms('', 'Mensaje de prueba');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Número de teléfono inválido');
  });
});
