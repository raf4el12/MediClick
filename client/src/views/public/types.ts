/** Contrato de `GET /public/doctors*` (UI-26): solo datos profesionales y reseñas visibles. */
export interface PublicSpecialty {
  id: number;
  name: string;
}

export interface PublicClinic {
  id: number;
  name: string;
  address: string | null;
}

export interface PublicDoctorSummary {
  id: number;
  name: string;
  lastName: string;
  photo: string | null;
  specialties: PublicSpecialty[];
  clinic: PublicClinic;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface PublicDoctor extends PublicDoctorSummary {
  resume: string | null;
  licenseNumber: string;
}

export interface PublicReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface PublicDoctorsPage {
  rows: PublicDoctorSummary[];
  totalRows: number;
  currentPage: number;
  totalPages: number;
}

export interface PublicDoctorReviews {
  rows: PublicReview[];
  totalRows: number;
  ratingAvg: number | null;
  ratingCount: number;
}
