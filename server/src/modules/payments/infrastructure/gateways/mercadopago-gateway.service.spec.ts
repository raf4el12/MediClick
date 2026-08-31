import { MercadoPagoGatewayService } from './mercadopago-gateway.service.js';

describe('MercadoPagoGatewayService.validateWebhookSignature', () => {
  const previousSecret = process.env.MP_WEBHOOK_SECRET;
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = 'webhook-test-secret';
    process.env.MP_ACCESS_TOKEN = 'access-token-test';
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = previousSecret;
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it('returns false instead of throwing when v1 has a different length', () => {
    const gateway = new MercadoPagoGatewayService();
    const body = JSON.stringify({ data: { id: '123' } });
    const headers = {
      'x-request-id': 'request-1',
      'x-signature': 'ts=1725048000,v1=x',
    };

    expect(() => gateway.validateWebhookSignature(headers, body)).not.toThrow();
    expect(gateway.validateWebhookSignature(headers, body)).toBe(false);
  });

  it('fails fast in production when payment secrets are absent', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MP_WEBHOOK_SECRET;
    delete process.env.MP_ACCESS_TOKEN;

    expect(() => new MercadoPagoGatewayService()).toThrow(
      'MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET son obligatorios en producción',
    );
  });
});
