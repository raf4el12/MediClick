import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import * as crypto from 'crypto';
import type {
  CreatePreferenceInput,
  CreatePreferenceOutput,
  GatewayPaymentStatus,
  IPaymentGatewayService,
} from '../../domain/services/payment-gateway.service.js';

@Injectable()
export class MercadoPagoGatewayService implements IPaymentGatewayService {
  private readonly logger = new Logger(MercadoPagoGatewayService.name);
  private readonly client: MercadoPagoConfig;

  constructor() {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      this.logger.warn(
        'MP_ACCESS_TOKEN no está configurado. Los pagos fallarán hasta que se agregue al .env',
      );
    }
    this.client = new MercadoPagoConfig({
      accessToken: accessToken ?? '',
      options: { timeout: 10000 },
    });
  }

  async createPreference(
    input: CreatePreferenceInput,
  ): Promise<CreatePreferenceOutput> {
    const preference = new Preference(this.client);

    const expirationFrom = new Date();
    const expirationTo = input.expiresInMs
      ? new Date(Date.now() + input.expiresInMs)
      : undefined;

    try {
      const bodyPayload = {
        items: input.items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: item.currencyId,
        })),
        external_reference: input.externalReference,
        back_urls: {
          success: input.backUrls.success,
          failure: input.backUrls.failure,
          pending: input.backUrls.pending,
        },
        notification_url: input.notificationUrl,
        ...(input.payerEmail && { payer: { email: input.payerEmail } }),
        ...(expirationTo && {
          expires: true,
          expiration_date_from: expirationFrom.toISOString(),
          expiration_date_to: expirationTo.toISOString(),
        }),
      };
      
      this.logger.debug(`Payload sent to MP: ${JSON.stringify(bodyPayload)}`);

      const response = await preference.create({
        body: bodyPayload,
      });

      if (!response.id || !response.init_point) {
        throw new Error('Mercado Pago no devolvió id o init_point');
      }

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point ?? response.init_point,
      };
    } catch (err) {
      this.logger.error(
        `Error al crear preference en Mercado Pago: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        'No se pudo generar el link de pago',
      );
    }
  }

  async getPayment(gatewayPaymentId: string): Promise<GatewayPaymentStatus> {
    const payment = new Payment(this.client);
    try {
      const response = await payment.get({ id: gatewayPaymentId });

      return {
        gatewayPaymentId: String(response.id),
        status: (response.status ?? 'pending') as GatewayPaymentStatus['status'],
        externalReference: response.external_reference ?? null,
        amount: Number(response.transaction_amount ?? 0),
        currency: response.currency_id ?? 'PEN',
        paymentMethod: response.payment_method_id ?? null,
        payerEmail: response.payer?.email ?? null,
        statusDetail: response.status_detail ?? null,
        approvedAt: response.date_approved
          ? new Date(response.date_approved)
          : null,
        raw: response,
      };
    } catch (err) {
      this.logger.error(
        `Error al consultar payment ${gatewayPaymentId} en Mercado Pago: ${
          (err as Error).message
        }`,
      );
      throw new InternalServerErrorException(
        'No se pudo consultar el estado del pago',
      );
    }
  }

  /**
   * Valida la firma HMAC del webhook según la spec de MP:
   * https://www.mercadopago.com.pe/developers/es/docs/your-integrations/notifications/webhooks
   *
   * Header x-signature tiene formato: "ts=<timestamp>,v1=<hash>"
   * El hash se genera con: id=<data.id>;request-id=<x-request-id>;ts=<ts>;
   */
  validateWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      // Si no hay secret configurado, no validamos. El use-case igual re-consulta MP.
      return true;
    }

    const signature = this.headerToString(headers['x-signature']);
    const requestId = this.headerToString(headers['x-request-id']);
    if (!signature || !requestId) return false;

    const parts = signature.split(',').reduce<Record<string, string>>(
      (acc, part) => {
        const [k, v] = part.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      },
      {},
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return false;

    // Intentar extraer data.id del body
    let dataId: string | undefined;
    try {
      const parsed = JSON.parse(rawBody);
      dataId = parsed?.data?.id ? String(parsed.data.id) : undefined;
    } catch {
      return false;
    }
    if (!dataId) return false;

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  }

  private headerToString(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
