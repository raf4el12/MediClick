import { describe, expect, it } from 'vitest';
import type { PatientRecordAppointment } from '../types';
import { toRecordTimeline } from './recordTimeline';

const appointment = (overrides: Partial<PatientRecordAppointment> = {}): PatientRecordAppointment => ({
  id: 1,
  startTime: '1970-01-01T09:30:00.000Z',
  status: 'COMPLETED',
  reason: 'Control anual',
  schedule: { scheduleDate: '2026-09-15T00:00:00.000Z', doctor: { name: 'Lucía', lastName: 'Paredes' } },
  clinicalNotes: [{ diagnosis: 'Hipertensión controlada', plan: 'Seguir con losartán' }],
  ...overrides,
});

describe('toRecordTimeline', () => {
  it('ordena las citas de la más reciente a la más antigua por su día y su hora', () => {
    const timeline = toRecordTimeline([
      appointment({ id: 1, schedule: { scheduleDate: '2026-09-15T00:00:00.000Z' } }),
      appointment({ id: 2, schedule: { scheduleDate: '2026-10-02T00:00:00.000Z' } }),
      appointment({ id: 3, startTime: '1970-01-01T16:00:00.000Z', schedule: { scheduleDate: '2026-09-15T00:00:00.000Z' } }),
    ]);

    expect(timeline.map((item) => [item.id, item.date, item.time])).toEqual([
      [2, '2026-10-02', '09:30'],
      [3, '2026-09-15', '16:00'],
      [1, '2026-09-15', '09:30'],
    ]);
  });

  it('rotula el estado con el vocabulario de la agenda y lleva médico y motivo', () => {
    const [cancelled, noShow, completed] = toRecordTimeline([
      appointment({ id: 1, status: 'CANCELLED', schedule: { scheduleDate: '2026-10-03T00:00:00.000Z' } }),
      appointment({ id: 2, status: 'NO_SHOW', reason: undefined, schedule: { scheduleDate: '2026-10-02T00:00:00.000Z' } }),
      appointment({ id: 3 }),
    ]);

    expect(cancelled).toMatchObject({ statusLabel: 'Cancelada', doctorName: null, reason: 'Control anual' });
    expect(noShow).toMatchObject({ statusLabel: 'Inasistencia', reason: null });
    expect(completed).toMatchObject({ statusLabel: 'Completada', statusColor: 'primary', doctorName: 'Lucía Paredes' });
  });

  it('lleva diagnóstico y plan solo de las notas que los tienen, sin inventarlos', () => {
    const [withNote, withoutNote, emptyNote] = toRecordTimeline([
      appointment({ id: 1, schedule: { scheduleDate: '2026-10-03T00:00:00.000Z' } }),
      appointment({ id: 2, clinicalNotes: undefined, schedule: { scheduleDate: '2026-10-02T00:00:00.000Z' } }),
      appointment({ id: 3, clinicalNotes: [{ diagnosis: undefined, plan: undefined }, { plan: 'Reposo' }] }),
    ]);

    expect(withNote!.notes).toEqual([{ diagnosis: 'Hipertensión controlada', plan: 'Seguir con losartán' }]);
    expect(withoutNote!.notes).toEqual([]);
    expect(emptyNote!.notes).toEqual([{ diagnosis: null, plan: 'Reposo' }]);
  });

  it('sin citas devuelve una línea de tiempo vacía', () => {
    expect(toRecordTimeline([])).toEqual([]);
  });
});
