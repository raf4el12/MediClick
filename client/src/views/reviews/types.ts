export interface ReviewPerson {
  id: number;
  name: string;
  lastName: string;
}

export interface Review {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  patient: ReviewPerson;
  doctor: ReviewPerson;
  createdAt: string;
}

export interface DoctorReviews {
  doctorId: number;
  ratingAvg: number | null;
  ratingCount: number;
  reviews: Review[];
}

export interface CreateReviewPayload {
  appointmentId: number;
  rating: number;
  comment?: string;
}

export interface ReviewModerationParams {
  isVisible?: boolean;
  rating?: number;
  doctorId?: number;
  currentPage?: number;
  pageSize?: number; // máximo 100
}

export interface ReviewStatsParams {
  doctorId?: number;
}

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

/** Agregados de la sede del actor: la distribución y el promedio cuentan solo visibles. */
export interface ReviewStats {
  total: number;
  visible: number;
  hidden: number;
  averageRating: number | null;
  distribution: Record<ReviewRating, number>;
}
