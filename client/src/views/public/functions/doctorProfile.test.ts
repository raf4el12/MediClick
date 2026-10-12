import { describe, expect, it } from 'vitest';
import type { PublicDoctorSummary } from '../types';
import { bookingHref, toDoctorProfileView } from './doctorProfile';

const doctor = (overrides: Partial<PublicDoctorSummary> = {}): PublicDoctorSummary => ({
  id: 1,
  name: 'Lucía',
  lastName: 'Paredes',
  photo: null,
  specialties: [
    { id: 2, name: 'Cardiología' },
    { id: 1, name: 'Medicina General' },
  ],
  clinic: { id: 1, name: 'Sede Miraflores', address: 'Av. Larco 1150' },
  ratingAvg: 4.666,
  ratingCount: 3,
  ...overrides,
});

describe('toDoctorProfileView', () => {
  it('arma nombre, iniciales sin foto, calificación con un decimal y especialidades', () => {
    expect(toDoctorProfileView(doctor())).toMatchObject({
      fullName: 'Lucía Paredes',
      initials: 'LP',
      photo: null,
      rating: '4.7',
      ratingLabel: '4.7 de 5 (3 reseñas)',
      specialties: 'Cardiología · Medicina General',
    });
  });

  it('sin reseñas no inventa una calificación', () => {
    const view = toDoctorProfileView(doctor({ ratingAvg: null, ratingCount: 0 }));
    expect(view.rating).toBeNull();
    expect(view.ratingLabel).toBe('Sin reseñas');
  });

  it('con una sola reseña usa el singular', () => {
    expect(toDoctorProfileView(doctor({ ratingAvg: 5, ratingCount: 1 })).ratingLabel).toBe('5.0 de 5 (1 reseña)');
  });
});

describe('bookingHref', () => {
  it('con sesión lleva a la reserva con el médico preseleccionado', () => {
    expect(bookingHref(1, { signedIn: true })).toBe('/patient/book?doctorId=1');
    expect(bookingHref(1, { signedIn: true, specialtyId: 2 })).toBe('/patient/book?doctorId=1&specialtyId=2');
  });

  it('sin sesión pasa por el inicio de sesión y vuelve a la reserva', () => {
    expect(bookingHref(1, { signedIn: false })).toBe('/login?from=%2Fpatient%2Fbook%3FdoctorId%3D1');
  });
});
