import { describe, expect, it } from 'vitest';
import { WaitlistEntryStatus, WaitlistTimePreference, type WaitlistEntry } from '../../types';
import { toWaitlistRows } from './waitlistRows';

const entry = (overrides: Partial<WaitlistEntry>): WaitlistEntry => ({
  id: 1,
  patientId: 100,
  patientName: 'Ana Torres',
  specialtyId: 2,
  specialtyName: 'Cardiología',
  doctorId: 12,
  doctorName: 'Lucía Paredes',
  clinicName: 'Sede Central',
  dateFrom: '2026-10-05T00:00:00.000Z',
  dateTo: '2026-10-20T00:00:00.000Z',
  timePreference: WaitlistTimePreference.MORNING,
  priority: 10,
  status: WaitlistEntryStatus.ACTIVE,
  waitUntil: null,
  notes: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

describe('toWaitlistRows', () => {
  it('conserva el orden del servidor y numera la posición desde 1', () => {
    const rows = toWaitlistRows([entry({ id: 7, priority: 30 }), entry({ id: 3, priority: 5 }), entry({ id: 9, priority: 50 })]);

    expect(rows.map((r) => [r.position, r.id])).toEqual([
      [1, 7],
      [2, 3],
      [3, 9],
    ]);
  });

  it('sin médico preferido se rotula «Cualquiera»', () => {
    const [withDoctor, without] = toWaitlistRows([entry({ id: 1 }), entry({ id: 2, doctorId: null, doctorName: null })]);

    expect(withDoctor!.doctor).toBe('Lucía Paredes');
    expect(without!.doctor).toBe('Cualquiera');
  });

  it('la ventana muestra los dos días en UTC y la franja su texto', () => {
    const [row] = toWaitlistRows([entry({ dateFrom: '2026-10-05T00:00:00.000Z', dateTo: '2026-10-20T00:00:00.000Z', timePreference: WaitlistTimePreference.AFTERNOON })]);

    expect(row!.window).toBe('05 oct. 2026 – 20 oct. 2026');
    expect(row!.timeSlot).toBe('Tarde (12:00 - 17:00)');
  });
});
