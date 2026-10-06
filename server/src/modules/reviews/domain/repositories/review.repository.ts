import {
  CreateReviewData,
  ReviewModerationFilters,
  ReviewWithRelations,
} from '../interfaces/review-data.interface.js';
import type { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';

export interface IReviewRepository {
  /**
   * Crea la reseña y recalcula el rating agregado del doctor en una
   * transacción (una reseña oculta no cuenta en el promedio).
   */
  create(data: CreateReviewData): Promise<ReviewWithRelations>;

  /** Dedupe: una reseña por cita. */
  existsByAppointmentId(appointmentId: number): Promise<boolean>;

  /**
   * Reseñas de un doctor; onlyVisible filtra las moderadas. Con
   * `scopeClinicId` solo devuelve algo si el médico es de esa sede.
   */
  findByDoctorId(
    doctorId: number,
    onlyVisible: boolean,
    scopeClinicId: number | null,
  ): Promise<ReviewWithRelations[]>;

  /** Reseñas escritas por un paciente. */
  findByPatientId(patientId: number): Promise<ReviewWithRelations[]>;

  /**
   * Cambia la visibilidad (moderación) y recalcula el agregado del doctor.
   * Con `scopeClinicId` solo afecta reseñas de médicos de esa sede; `null`
   * no acota. Devuelve null si la reseña no existe o está fuera de alcance.
   */
  setVisibility(
    id: number,
    isVisible: boolean,
    scopeClinicId: number | null,
  ): Promise<ReviewWithRelations | null>;
  /** Reseñas para moderar, visibles y ocultas, más recientes primero. */
  findForModeration(
    filters: ReviewModerationFilters,
    page: { offset: number; limit: number },
  ): Promise<PaginatedResult<ReviewWithRelations>>;
}
