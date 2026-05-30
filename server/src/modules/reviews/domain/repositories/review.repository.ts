import {
  CreateReviewData,
  ReviewWithRelations,
} from '../interfaces/review-data.interface.js';

export interface IReviewRepository {
  /**
   * Crea la reseña y recalcula el rating agregado del doctor en una
   * transacción (una reseña oculta no cuenta en el promedio).
   */
  create(data: CreateReviewData): Promise<ReviewWithRelations>;

  /** Dedupe: una reseña por cita. */
  existsByAppointmentId(appointmentId: number): Promise<boolean>;

  /** Reseñas de un doctor; onlyVisible filtra las moderadas. */
  findByDoctorId(
    doctorId: number,
    onlyVisible: boolean,
  ): Promise<ReviewWithRelations[]>;

  /** Reseñas escritas por un paciente. */
  findByPatientId(patientId: number): Promise<ReviewWithRelations[]>;

  /**
   * Cambia la visibilidad (moderación) y recalcula el agregado del doctor.
   * Devuelve null si la reseña no existe.
   */
  setVisibility(
    id: number,
    isVisible: boolean,
  ): Promise<ReviewWithRelations | null>;
}
