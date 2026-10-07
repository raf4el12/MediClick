import type {
  PublicDoctorRecord,
  PublicReviewRecord,
} from '../domain/repositories/public-directory.repository.js';
import type {
  PublicDoctorDto,
  PublicDoctorSummaryDto,
  PublicReviewDto,
} from './dto/public-doctor.dto.js';

// Lista blanca explícita: un campo nuevo en el registro nunca sale solo.
export function toPublicDoctorSummary(
  r: PublicDoctorRecord,
): PublicDoctorSummaryDto {
  return {
    id: r.id,
    name: r.name,
    lastName: r.lastName,
    photo: r.photo,
    specialties: r.specialties.map((s) => ({ id: s.id, name: s.name })),
    clinic: { id: r.clinic.id, name: r.clinic.name, address: r.clinic.address },
    ratingAvg: r.ratingAvg,
    ratingCount: r.ratingCount,
  };
}

export function toPublicDoctor(r: PublicDoctorRecord): PublicDoctorDto {
  return {
    ...toPublicDoctorSummary(r),
    resume: r.resume,
    licenseNumber: r.licenseNumber,
  };
}

export function toPublicReview(r: PublicReviewRecord): PublicReviewDto {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
  };
}
