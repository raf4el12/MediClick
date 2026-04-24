import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhookPayloadDto } from '../../application/dto/webhook-payload.dto.js';
import { HandlePaymentWebhookUseCase } from '../../application/use-cases/handle-payment-webhook.use-case.js';
import type { IPaymentGatewayService } from '../../domain/services/payment-gateway.service.js';

/**
 * Controlador PÚBLICO (sin @Auth). Recibe notificaciones de Mercado Pago.
 * Siempre responde 200 OK — los errores se loguean pero no se propagan,
 * para evitar que MP entre en loops de retry.
 */
@ApiExcludeController()
@Controller('payments')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase,
    @Inject('IPaymentGatewayService')
    private readonly gateway: IPaymentGatewayService,
  ) {}

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() request: Request,
    @Body() body: WebhookPayloadDto,
  ): Promise<{ received: true }> {
    const rawBody =
      (request as Request & { rawBody?: Buffer }).rawBody?.toString('utf8') ??
      JSON.stringify(body);

    const isValid = this.gateway.validateWebhookSignature(
      request.headers,
      rawBody,
    );
    if (!isValid) {
      this.logger.warn(
        'Webhook con firma inválida — se procesa igual porque re-consultamos a MP',
      );
    }

    try {
      await this.handlePaymentWebhookUseCase.execute(body);
    } catch (err) {
      this.logger.error(
        `Error al procesar webhook: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    return { received: true };
  }
}
