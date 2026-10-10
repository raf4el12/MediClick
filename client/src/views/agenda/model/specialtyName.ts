import type { AgendaSnapshot } from '../types';

export const specialtyName = (agenda: AgendaSnapshot, specialtyId: number) =>
  agenda.doctors.flatMap((d) => d.specialties).find((s) => s.id === specialtyId)?.name ?? '';
