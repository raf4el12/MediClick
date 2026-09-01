import type {
  CreateWaitlistOfferData,
  WaitlistOfferWithEntry,
} from '../interfaces/waitlist-data.interface.js';

/**
 * Resultado de `acceptOfferAtomically`: la cita ya nace con precio y plazo,
 * la entrada de lista de espera queda `FULFILLED` y la oferta queda
 * `ACCEPTED` con el vínculo a la cita — todo en la misma transacción
 * serializable (SDD-013, G-01).
 */
export interface AcceptedWaitlistOffer {
  offer: WaitlistOfferWithEntry;
  appointment: {
    id: number;
    scheduleId: number;
    startTime: Date;
    endTime: Date;
    status: string;
    paymentStatus: string;
    amount: number | null;
    pendingUntil: Date | null;
    schedule: {
      doctor: { profile: { name: string; lastName: string } };
    };
  };
}

/** Motivo por el que `acceptOfferAtomically` no pudo completar la aceptación. */
export type AcceptOfferAtomicallyFailureReason =
  | 'OFFER_NOT_CLAIMABLE'
  | 'SLOT_OVERLAP';

export class AcceptOfferAtomicallyError extends Error {
  constructor(public readonly reason: AcceptOfferAtomicallyFailureReason) {
    super(reason);
  }
}

export interface IWaitlistOfferRepository {
  create(data: CreateWaitlistOfferData): Promise<WaitlistOfferWithEntry>;
  findById(id: number): Promise<WaitlistOfferWithEntry | null>;
  findPendingBySlot(
    scheduleId: number,
    clinicId: number | null,
  ): Promise<WaitlistOfferWithEntry | null>;

  /** Ofertas PENDING vigentes de un paciente (para mostrar countdown) */
  findPendingByPatient(patientId: number): Promise<WaitlistOfferWithEntry[]>;

  /**
   * Claim atómico de una oferta: la marca ACCEPTED solo si sigue PENDING y vigente.
   * Devuelve la oferta si el claim tuvo éxito, o null si ya fue tomada/expiró.
   *
   * @deprecated usar `acceptOfferAtomically`, que hace este claim y el resto
   * de la aceptación (creación de cita, cierre de entrada, vínculo de oferta)
   * dentro de una única transacción serializable (SDD-013).
   */
  claimPending(
    offerId: number,
    now: Date,
  ): Promise<WaitlistOfferWithEntry | null>;

  /** Marca la oferta como REJECTED (solo si está PENDING). Devuelve la oferta o null. */
  markRejected(offerId: number): Promise<WaitlistOfferWithEntry | null>;

  /** Enlaza la cita creada tras aceptar la oferta */
  setCreatedAppointment(offerId: number, appointmentId: number): Promise<void>;

  /**
   * Cron: marca como EXPIRED las ofertas PENDING vencidas y las devuelve,
   * para que el matcher reintente cada slot con el siguiente paciente.
   */
  expireStaleReturning(now: Date): Promise<WaitlistOfferWithEntry[]>;

  /**
   * Aceptación atómica de una oferta (SDD-013). Dentro de una única
   * transacción serializable:
   *
   * 1. Reclama la oferta solo si sigue PENDING, vigente y pertenece al paciente.
   * 2. Revalida solapamiento de doctor y de paciente contra el slot ofrecido
   *    (protege contra una reserva directa que tomó el slot entre la oferta
   *    y esta aceptación).
   * 3. Crea la cita ya con `amount` y `pendingUntil` (nunca queda una cita
   *    pendiente sin plazo).
   * 4. Marca la entrada de lista de espera como FULFILLED.
   * 5. Vincula `createdAppointmentId` en la oferta y la marca ACCEPTED.
   *
   * Lanza `AcceptOfferAtomicallyError('OFFER_NOT_CLAIMABLE')` si la oferta no
   * existe, no pertenece al paciente, ya no está PENDING o ya venció.
   * Lanza `AcceptOfferAtomicallyError('SLOT_OVERLAP')` si el slot fue tomado
   * por otra cita (directa o de otra oferta) dentro de la misma transacción.
   */
  acceptOfferAtomically(input: {
    offerId: number;
    patientId: number;
    now: Date;
    pendingUntil: Date;
    amount: number | null;
    reason?: string;
  }): Promise<AcceptedWaitlistOffer>;
}
