import type { ApiRequest } from '../support/api';
import { reply } from '../support/api';

/** Día local de Lima desplazado `offset` días desde hoy (YYYY-MM-DD). */
export function limaDay(offset: number): string {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()).split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(y, m - 1, d + offset));
  return date.toISOString().slice(0, 10);
}

/** "12 de octubre", como lo anuncia el calendario. */
export const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

const page = <T>(rows: T[]) => ({ totalRows: rows.length, totalPages: 1, currentPage: 1, rows });

export const clinics = [
  { id: 1, name: 'Sede Miraflores', address: null, phone: null, email: null, timezone: 'America/Lima', currency: 'PEN', isActive: true, createdAt: '2026-01-01' },
  { id: 2, name: 'Sede Chapinero', address: null, phone: null, email: null, timezone: 'America/Bogota', currency: 'COP', isActive: true, createdAt: '2026-01-01' },
];

const category = { id: 1, name: 'Clínica', description: null };
export const specialties = [
  { id: 1, name: 'Medicina General', description: null, duration: 20, price: 80, requirements: null, icon: null, clinicId: null, isActive: true, createdAt: '2026-01-01', category },
  { id: 2, name: 'Cardiología', description: null, duration: 30, price: 150, requirements: null, icon: null, clinicId: null, isActive: true, createdAt: '2026-01-01', category },
  { id: 3, name: 'Pediatría', description: null, duration: 30, price: 120, requirements: null, icon: null, clinicId: 2, isActive: true, createdAt: '2026-01-01', category },
];

const doctor = (id: number, name: string, lastName: string, clinicId: number, specialtyIds: number[]) => {
  const clinic = clinics.find((c) => c.id === clinicId)!;
  return {
    id,
    licenseNumber: `CMP-${id}`,
    resume: null,
    ratingAvg: 4.5,
    ratingCount: 10,
    clinicId,
    clinic: { id: clinic.id, name: clinic.name, timezone: clinic.timezone, currency: clinic.currency },
    isActive: true,
    createdAt: '2026-01-01',
    profile: { id, name, lastName, email: `${name.toLowerCase()}@test.local`, phone: null, gender: null },
    user: null,
    specialties: specialties.filter((s) => specialtyIds.includes(s.id)).map((s) => ({ id: s.id, name: s.name })),
  };
};

export const doctors = [
  doctor(1, 'Lucía', 'Paredes', 1, [1, 2]),
  doctor(4, 'Martín', 'Fernández', 1, [2]),
  doctor(5, 'Sofía', 'Méndez', 1, [2]),
];

export const slots = [
  { scheduleId: 10, startTime: '09:00', endTime: '09:30', available: true },
  { scheduleId: 10, startTime: '09:30', endTime: '10:00', available: false },
  { scheduleId: 10, startTime: '10:00', endTime: '10:30', available: true },
];

export const firstDay = limaDay(2);
// Ambos días con cupos caen en el mismo mes, así el mes siguiente queda vacío.
export const secondDay = limaDay(3).slice(0, 7) === firstDay.slice(0, 7) ? limaDay(3) : firstDay;

/** Un día del mes de `firstDay` sin cupos. */
export const dayWithoutSlots = ['15', '16', '17']
  .map((d) => `${firstDay.slice(0, 8)}${d}`)
  .find((d) => d !== firstDay && d !== secondDay)!;

/** Respuestas del catálogo de reserva; la Dra. Méndez no tiene cupos. */
export function bookingRoutes() {
  return {
    'GET /clinics': page(clinics),
    'GET /specialties': page(specialties),
    'GET /doctors': ({ query }: ApiRequest) => {
      const specialtyId = Number(query.get('specialtyId'));
      const clinicId = query.get('clinicId') ? Number(query.get('clinicId')) : null;
      return page(
        doctors.filter((d) => d.specialties.some((s) => s.id === specialtyId) && (clinicId === null || d.clinicId === clinicId)),
      );
    },
    'GET /doctors/:id': ({ path }: ApiRequest) => {
      const found = doctors.find((d) => d.id === Number(path.split('/').pop()));
      return found ?? reply(404, { message: 'Médico no encontrado' });
    },
    'GET /schedules/available-days': ({ query }: ApiRequest) => ({
      doctorId: Number(query.get('doctorId')),
      specialtyId: Number(query.get('specialtyId')),
      timezone: 'America/Lima',
      days:
        Number(query.get('doctorId')) === 5
          ? []
          : [...new Set([firstDay, secondDay])].map((date) => ({ date, availableCount: 2 })),
    }),
    'GET /schedules/time-slots': slots,
  };
}
