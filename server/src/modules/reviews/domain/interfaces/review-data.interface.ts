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
