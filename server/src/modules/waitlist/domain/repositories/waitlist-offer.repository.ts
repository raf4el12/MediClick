import type {
  CreateWaitlistOfferData,
  WaitlistOfferWithEntry,
} from '../interfaces/waitlist-data.interface.js';

export interface IWaitlistOfferRepository {
  create(data: CreateWaitlistOfferData): Promise<WaitlistOfferWithEntry>;
  findById(id: number): Promise<WaitlistOfferWithEntry | null>;

  /** Ofertas PENDING vigentes de un paciente (para mostrar countdown) */
  findPendingByPatient(patientId: number): Promise<WaitlistOfferWithEntry[]>;

  /**
   * Claim atómico de una oferta: la marca ACCEPTED solo si sigue PENDING y vigente.
   * Devuelve la oferta si el claim tuvo éxito, o null si ya fue tomada/expiró.
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
}
