import { UnauthorizedException } from '@nestjs/common';
import type { IPaymentGatewayService } from '../../domain/services/payment-gateway.service.js';
import { PaymentWebhookController } from './payment-webhook.controller.js';

describe('PaymentWebhookController', () => {
  let handle: { execute: jest.Mock };
  let gateway: jest.Mocked<Pick<IPaymentGatewayService, 'validateWebhookSignature'>>;
  let controller: PaymentWebhookController;
  const body = { type: 'payment', data: { id: 'mp_1' } };
  const request = {
    headers: {},
    rawBody: Buffer.from(JSON.stringify(body)),
  };

  beforeEach(() => {
    handle = { execute: jest.fn() };
    gateway = { validateWebhookSignature: jest.fn() };
    controller = new PaymentWebhookController(handle as any, gateway as any);
  });

  it('rejects an invalid signature without processing the payload', async () => {
    gateway.validateWebhookSignature.mockReturnValue(false);

    await expect(controller.receive(request as any, body as any)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(handle.execute).not.toHaveBeenCalled();
  });

  it('propagates processing failures so the provider receives a 5xx', async () => {
    gateway.validateWebhookSignature.mockReturnValue(true);
    handle.execute.mockRejectedValue(new Error('database unavailable'));

    await expect(controller.receive(request as any, body as any)).rejects.toThrow(
      'database unavailable',
    );
  });

  it('returns 200 payload only after a valid event is processed', async () => {
    gateway.validateWebhookSignature.mockReturnValue(true);

    await expect(controller.receive(request as any, body as any)).resolves.toEqual({
      received: true,
    });
    expect(handle.execute).toHaveBeenCalledWith(body);
  });
});
