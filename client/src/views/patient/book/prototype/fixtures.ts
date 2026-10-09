// PROTOTIPO UI-06 — Tres variantes del flujo de reserva, conmutables con `?variant=`,
// sobre `/patient/book` (reserva en línea) y el diálogo de `/appointments` (creación
// administrativa). Datos falsos en memoria: nada de esto llama a la API ni se mergea.

export type Clinic = { id: number; name: string; city: string; timezone: string; currency: string; locale: string };
export type Specialty = {
  id: number;
  name: string;
  icon: string;
  durationMinutes: number;
  /** Precio en la moneda de cada sede. */
  priceByClinic: Record<number, number>;
};
export type Doctor = {
  id: number;
  name: string;
  clinicId: number;
  specialtyIds: number[];
  rating: number;
  reviews: number;
};
export type Patient = { id: number; name: string; document: string; email: string };
export type Slot = { time: string; available: boolean };
export type Day = { date: string; slots: Slot[]; reason?: 'holiday' | 'blocked' | 'full' };

export const clinics: Clinic[] = [
  { id: 1, name: 'Sede Miraflores', city: 'Lima', timezone: 'America/Lima', currency: 'PEN', locale: 'es-PE' },
  { id: 2, name: 'Sede Chapinero', city: 'Bogotá', timezone: 'America/Bogota', currency: 'COP', locale: 'es-CO' },
  { id: 3, name: 'Sede Palermo', city: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS', locale: 'es-AR' },
];

export const specialties: Specialty[] = [
  { id: 1, name: 'Medicina General', icon: 'ri-stethoscope-line', durationMinutes: 20, priceByClinic: { 1: 80, 2: 90000, 3: 35000 } },
  { id: 2, name: 'Cardiología', icon: 'ri-heart-pulse-line', durationMinutes: 30, priceByClinic: { 1: 150, 2: 180000, 3: 60000 } },
  { id: 3, name: 'Pediatría', icon: 'ri-bear-smile-line', durationMinutes: 30, priceByClinic: { 1: 120, 2: 140000, 3: 45000 } },
  { id: 4, name: 'Dermatología', icon: 'ri-hand-heart-line', durationMinutes: 20, priceByClinic: { 1: 130, 2: 150000, 3: 50000 } },
  { id: 5, name: 'Ginecología', icon: 'ri-women-line', durationMinutes: 30, priceByClinic: { 1: 140, 2: 160000, 3: 55000 } },
  { id: 6, name: 'Traumatología', icon: 'ri-body-scan-line', durationMinutes: 40, priceByClinic: { 1: 160, 2: 190000, 3: 65000 } },
];

export const doctors: Doctor[] = [
  { id: 1, name: 'Dra. Lucía Paredes', clinicId: 1, specialtyIds: [1, 2], rating: 4.8, reviews: 126 },
  { id: 2, name: 'Dr. Andrés Quispe', clinicId: 1, specialtyIds: [3], rating: 4.6, reviews: 88 },
  { id: 3, name: 'Dra. Camila Rojas', clinicId: 2, specialtyIds: [1, 4], rating: 4.9, reviews: 203 },
  { id: 4, name: 'Dr. Martín Fernández', clinicId: 3, specialtyIds: [2, 6], rating: 4.5, reviews: 61 },
  // Sin cupos en los próximos 30 días: sirve para ver el estado vacío.
  { id: 5, name: 'Dra. Sofía Méndez', clinicId: 1, specialtyIds: [1, 5], rating: 4.7, reviews: 97 },
];

export const patients: Patient[] = [
  { id: 1, name: 'Ana Torres', document: 'DNI 45871236', email: 'ana.torres@test.local' },
  { id: 2, name: 'Bruno Salazar', document: 'DNI 70123958', email: 'bruno.salazar@test.local' },
  { id: 3, name: 'Carla Gómez', document: 'CC 1020304050', email: 'carla.gomez@test.local' },
  { id: 4, name: 'Diego Herrera', document: 'DNI 33445566', email: 'diego.herrera@test.local' },
  { id: 5, name: 'Elena Vargas', document: 'DNI 29384756', email: 'elena.vargas@test.local' },
  { id: 6, name: 'Fernando Ríos', document: 'CC 80706050', email: 'fernando.rios@test.local' },
  { id: 7, name: 'Gabriela Castro', document: 'DNI 41526374', email: 'gabriela.castro@test.local' },
  { id: 8, name: 'Hugo Medina', document: 'DNI 38291047', email: 'hugo.medina@test.local' },
  { id: 9, name: 'Isabel Núñez', document: 'DNI 47382910', email: 'isabel.nunez@test.local' },
  { id: 10, name: 'Javier Ortiz', document: 'CC 1098765432', email: 'javier.ortiz@test.local' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const clinicById = (id?: number | null) => clinics.find((c) => c.id === id);
export const specialtyById = (id?: number | null) => specialties.find((s) => s.id === id);
export const doctorById = (id?: number | null) => doctors.find((d) => d.id === id);

/** Próximos 30 días de cupos del médico para la especialidad, con un feriado, un bloqueo y un día lleno. */
export function daysFor(doctorId: number, specialtyId: number): Day[] {
  const specialty = specialtyById(specialtyId);
  const duration = specialty?.durationMinutes ?? 30;
  const start = new Date();
  const days: Day[] = [];
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const weekday = date.getDay();
    if (weekday === 0) continue; // domingo sin agenda
    const iso = toISO(date);
    if (offset === 5) {
      days.push({ date: iso, slots: [], reason: 'holiday' });
      continue;
    }
    const slots: Slot[] = [];
    const lastMinute = weekday === 6 ? 12 * 60 : 13 * 60;
    for (let m = 8 * 60; m + duration <= lastMinute; m += duration) {
      const taken = doctorId === 5 || offset === 7 || (m / duration + offset + doctorId) % 3 === 0;
      // Bloqueo de medio día: desde las 11:00 no hay agenda.
      if (offset === 3 && m >= 11 * 60) break;
      slots.push({ time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, available: !taken });
    }
    days.push({ date: iso, slots, reason: offset === 3 ? 'blocked' : slots.every((s) => !s.available) ? 'full' : undefined });
  }
  return days;
}

export const availableDays = (doctorId: number, specialtyId: number) =>
  daysFor(doctorId, specialtyId).filter((d) => d.slots.some((s) => s.available));

/** Primer cupo libre del médico, para "próximo cupo" y para "cualquier médico". */
export function firstAvailable(doctorId: number, specialtyId: number): { date: string; time: string } | null {
  const day = availableDays(doctorId, specialtyId)[0];
  const slot = day?.slots.find((s) => s.available);
  return day && slot ? { date: day.date, time: slot.time } : null;
}

export const formatMoney = (amount: number, clinic: Clinic) =>
  new Intl.NumberFormat(clinic.locale, { style: 'currency', currency: clinic.currency, maximumFractionDigits: 0 }).format(amount);

export const formatDay = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('es', opts).format(new Date(`${iso}T12:00:00`));

export const PAYMENT_MINUTES = 15;
