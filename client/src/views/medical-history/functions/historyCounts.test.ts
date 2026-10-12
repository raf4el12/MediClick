import { describe, expect, it } from 'vitest';
import { MedicalHistoryStatus, type MedicalHistory } from '../types';
import { historyCounts } from './historyCounts';

const entry = (id: number, status: MedicalHistoryStatus): MedicalHistory => ({
  id,
  patientId: 7,
  condition: `Condición ${id}`,
  description: null,
  diagnosedDate: null,
  status,
  notes: null,
  patient: { id: 7, name: 'Ana', lastName: 'Torres' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: null,
});

describe('historyCounts', () => {
  it('cuenta las entradas activas, crónicas y resueltas', () => {
    const counts = historyCounts([
      entry(1, MedicalHistoryStatus.ACTIVE),
      entry(2, MedicalHistoryStatus.CHRONIC),
      entry(3, MedicalHistoryStatus.CHRONIC),
      entry(4, MedicalHistoryStatus.RESOLVED),
      entry(5, MedicalHistoryStatus.ACTIVE),
      entry(6, MedicalHistoryStatus.ACTIVE),
    ]);

    expect(counts).toEqual({ active: 3, chronic: 2, resolved: 1 });
  });

  it('sin entradas todo es cero', () => {
    expect(historyCounts([])).toEqual({ active: 0, chronic: 0, resolved: 0 });
  });
});
