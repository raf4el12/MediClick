import type { ReminderKind } from '@prisma/client';

export interface ReminderDeliveryClaim {
  id: number;
  appointmentId: number;
  kind: ReminderKind;
  channel: string;
  scheduledFor: Date;
  claimToken: string;
}

export interface ClaimReminderDeliveryInput {
  appointmentId: number;
  kind: ReminderKind;
  channel: string;
  scheduledFor: Date;
  now: Date;
}

export interface IAppointmentReminderDeliveryRepository {
  /**
   * Reclama de forma atómica la entrega de un recordatorio para una cita, tipo, canal e instante agendado.
   * Si no existe, lo crea con estado PROCESSING y lockedUntil de 5 minutos.
   * Si ya existe como FAILED con nextAttemptAt <= now o PROCESSING expirado, lo reclama.
   * Si ya fue entregado (SENT) o está siendo procesado activamente, retorna null.
   */
  claim(
    input: ClaimReminderDeliveryInput,
  ): Promise<ReminderDeliveryClaim | null>;

  /**
   * Marca la entrega como SENT si el claimToken coincide con el lock actual.
   * Retorna true si ganó la actualización o false si el token expiró/cambió.
   */
  markSent(id: number, claimToken: string, sentAt: Date): Promise<boolean>;

  /**
   * Marca la entrega como FAILED con backoff de reintento si el claimToken coincide.
   */
  markFailed(
    id: number,
    claimToken: string,
    nextAttemptAt: Date,
    errorCode: string,
  ): Promise<boolean>;
}
