import { getInitials } from '@/utils/getInitials';
import type { PublicDoctorSummary } from '../types';

/** Datos del perfil público listos para mostrar. */
export function toDoctorProfileView(doctor: PublicDoctorSummary) {
  const fullName = `${doctor.name} ${doctor.lastName}`;
  const rating = doctor.ratingAvg === null || doctor.ratingCount === 0 ? null : doctor.ratingAvg.toFixed(1);

  return {
    fullName,
    initials: getInitials(fullName),
    photo: doctor.photo,
    rating,
    ratingLabel: rating === null ? 'Sin reseñas' : `${rating} de 5 (${doctor.ratingCount} ${doctor.ratingCount === 1 ? 'reseña' : 'reseñas'})`,
    specialties: doctor.specialties.map((s) => s.name).join(' · '),
  };
}

/**
 * Enlace a la reserva con el médico preseleccionado (UI-08 acepta `doctorId` y `specialtyId`).
 * Sin sesión pasa por el inicio de sesión, que vuelve a la reserva con `from`.
 */
export function bookingHref(doctorId: number, { signedIn, specialtyId }: { signedIn: boolean; specialtyId?: number }) {
  const params = new URLSearchParams({ doctorId: String(doctorId) });
  if (specialtyId !== undefined) params.set('specialtyId', String(specialtyId));
  const book = `/patient/book?${params.toString()}`;

  return signedIn ? book : `/login?from=${encodeURIComponent(book)}`;
}
