export interface CreatePreferenceInput {
  /** Identificador interno que usamos como external_reference (appointmentId). */
  externalReference: string;
  /** Ítems del checkout. Para MediClick usualmente será un único ítem = la cita. */
  items: Array<{
    id: string;
    title: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    currencyId: string;
  }>;
  /** Email del pagador (paciente) — pre-llena el checkout de MP. */
  payerEmail?: string;
  /** URLs de retorno post-pago. */
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  /** URL pública del webhook. */
  notificationUrl: string;
  /** Tiempo de vida de la preference en milisegundos (sincronizado con pendingUntil). */
  expiresInMs?: number;
}

export interface CreatePreferenceOutput {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export interface GatewayPaymentStatus {
  gatewayPaymentId: string;
  status:
    | 'approved'
    | 'pending'
    | 'in_process'
    | 'rejected'
    | 'refunded'
    | 'cancelled'
    | 'charged_back'
    | 'authorized';
  externalReference: string | null;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  payerEmail: string | null;
  statusDetail: string | null;
  approvedAt: Date | null;
  raw: unknown;
}

/**
 * Contrato abstracto de la pasarela de pagos.
 * La implementación concreta vive en infrastructure/gateways (Mercado Pago).
 * Un swap de proveedor solo requiere una nueva implementación de esta interface.
 */
export interface IPaymentGatewayService {
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput>;
  getPayment(gatewayPaymentId: string): Promise<GatewayPaymentStatus>;
  validateWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean;
}
