import { ReviewWithRelations } from '../../domain/interfaces/review-data.interface.js';
import { ReviewResponseDto } from '../dto/review-response.dto.js';

export function toReviewResponse(r: ReviewWithRelations): ReviewResponseDto {
  return {
    id: r.id,
    appointmentId: r.appointmentId,
    doctorId: r.doctorId,
    patientId: r.patientId,
    rating: r.rating,
    comment: r.comment,
    isVisible: r.isVisible,
    patient: {
      id: r.patient.id,
      name: r.patient.profile.name,
      lastName: r.patient.profile.lastName,
    },
    doctor: {
      id: r.doctor.id,
      name: r.doctor.profile.name,
      lastName: r.doctor.profile.lastName,
    },
    createdAt: r.createdAt,
  };
}
