import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhookPayloadDto } from '../../application/dto/webhook-payload.dto.js';
import { HandlePaymentWebhookUseCase } from '../../application/use-cases/handle-payment-webhook.use-case.js';
import type { IPaymentGatewayService } from '../../domain/services/payment-gateway.service.js';

/**
 * Controlador PÚBLICO (sin @Auth). Recibe notificaciones de Mercado Pago.
 * Responde 200 solo cuando la firma es válida y el evento se procesó. Los
 * fallos transitorios se propagan para que el proveedor pueda reintentar.
 */
@ApiExcludeController()
@Controller('payments')
export class PaymentWebhookController {
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
      throw new UnauthorizedException('Firma de webhook inválida');
    }

    await this.handlePaymentWebhookUseCase.execute(body);

    return { received: true };
  }
}
