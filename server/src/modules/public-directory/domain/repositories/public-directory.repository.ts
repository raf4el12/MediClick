/**
 * Lectura pública (sin usuario) del directorio de médicos. Solo devuelve
 * médicos activos, no borrados, de una sede activa y no borrada, y reseñas
 * visibles. Es intencionalmente global: el paciente es multi-sede.
 */
export interface PublicDoctorRecord {
  id: number;
  name: string;
  lastName: string;
  photo: string | null;
  resume: string | null;
  licenseNumber: string;
  ratingAvg: number | null;
  ratingCount: number;
  specialties: { id: number; name: string }[];
  clinic: { id: number; name: string; address: string | null };
}

export interface PublicReviewRecord {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface PublicDoctorFilters {
  clinicId?: number;
  specialtyId?: number;
  searchValue?: string;
}

export interface PageRequest {
  offset: number;
  limit: number;
}

export interface IPublicDirectoryRepository {
  listDoctors(
    filters: PublicDoctorFilters,
    page: PageRequest,
  ): Promise<{ rows: PublicDoctorRecord[]; totalRows: number }>;
  findDoctor(id: number): Promise<PublicDoctorRecord | null>;
  listVisibleReviews(
    doctorId: number,
    page: PageRequest,
  ): Promise<{ rows: PublicReviewRecord[]; totalRows: number }>;
}
