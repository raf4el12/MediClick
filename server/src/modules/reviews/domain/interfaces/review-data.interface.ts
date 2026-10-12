export interface CreateReviewData {
  appointmentId: number;
  doctorId: number;
  patientId: number;
  rating: number;
  comment?: string;
  clinicId?: number | null;
}

export interface ReviewWithRelations {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: Date;
  patient: {
    id: number;
    profile: { name: string; lastName: string };
  };
  doctor: {
    id: number;
    profile: { name: string; lastName: string };
  };
}

export interface DoctorRatingAggregate {
  ratingAvg: number | null;
  ratingCount: number;
}

export interface ReviewModerationFilters {
  /** Sede de los médicos; `null` no acota (actor global). */
  clinicId: number | null;
  isVisible?: boolean;
  rating?: number;
  doctorId?: number;
}

export interface ReviewStatsFilters {
  /** Sede de los médicos; `null` no acota (actor global). */
  clinicId: number | null;
  doctorId?: number;
}

export interface ReviewStats {
  total: number;
  visible: number;
  /** Promedio de las visibles sin redondear (null si no hay). */
  averageRating: number | null;
  /** Reseñas visibles por calificación 1..5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
