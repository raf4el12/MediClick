import { AppointmentQrService } from './appointment-qr.service.js';
import { ConfigService } from '@nestjs/config';

describe('AppointmentQrService (Check-in QR Criptográfico)', () => {
  let service: AppointmentQrService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultVal: string) => {
        if (key === 'QR_SECRET' || key === 'JWT_SECRET') {
          return 'test-secret-key-1234567890123456';
        }
        return defaultVal;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AppointmentQrService(configService);
  });

  it('RED->GREEN: genera y valida un token QR legítimo para una cita médica', () => {
    const identity = {
      appointmentId: 42,
      patientId: 7,
      clinicId: 1,
    };
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    const token = service.generateCheckInQrToken(identity, expiresAt);
    expect(token).toMatch(/^mc_qr_[A-Za-z0-9_-]+\.[a-f0-9]+$/);

    const validation = service.validateCheckInQrToken(token);
    expect(validation.valid).toBe(true);
    expect(validation.payload?.appointmentId).toBe(42);
    expect(validation.payload?.patientId).toBe(7);
    expect(validation.payload?.clinicId).toBe(1);
    expect(validation.payload?.exp).toBe(
      Math.floor(expiresAt.getTime() / 1000),
    );
  });

  it('RED->GREEN: rechaza token adulterado o con firma incorrecta', () => {
    const identity = {
      appointmentId: 42,
      patientId: 7,
      clinicId: 1,
    };
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    const token = service.generateCheckInQrToken(identity, expiresAt);
    const tampered = token.slice(0, -4) + 'abcd';

    const validation = service.validateCheckInQrToken(tampered);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Firma criptográfica inválida');
  });

  it('RED->GREEN: rechaza token expirado', () => {
    // Generar con fecha de expiración en el pasado
    const expiredPayload = {
      appointmentId: 42,
      patientId: 7,
      clinicId: 1,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hora en el pasado
    };

    const expiredToken = service['signPayload'](expiredPayload);
    const validation = service.validateCheckInQrToken(expiredToken);

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Token QR expirado');
  });
});
