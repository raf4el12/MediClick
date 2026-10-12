import { MedicalHistoryStatus, type MedicalHistory } from '../types';

/** Antecedentes por estado en las entradas cargadas (la página visible, como antes). */
export function historyCounts(entries: MedicalHistory[]) {
  return {
    active: entries.filter((e) => e.status === MedicalHistoryStatus.ACTIVE).length,
    chronic: entries.filter((e) => e.status === MedicalHistoryStatus.CHRONIC).length,
    resolved: entries.filter((e) => e.status === MedicalHistoryStatus.RESOLVED).length,
  };
}
