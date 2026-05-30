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
