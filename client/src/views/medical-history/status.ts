import { MedicalHistoryStatus } from './types';

export const HISTORY_STATUS: Record<MedicalHistoryStatus, { label: string; color: 'info' | 'warning' | 'success' }> = {
  [MedicalHistoryStatus.ACTIVE]: { label: 'Activa', color: 'info' },
  [MedicalHistoryStatus.CHRONIC]: { label: 'Crónica', color: 'warning' },
  [MedicalHistoryStatus.RESOLVED]: { label: 'Resuelta', color: 'success' },
};

export const HISTORY_STATUSES = Object.keys(HISTORY_STATUS) as MedicalHistoryStatus[];

/** Fecha de diagnóstico (solo día, guardada en UTC). */
export const diagnosedLabel = (date: string | null, month: 'short' | 'long' = 'short') =>
  date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month, year: 'numeric', timeZone: 'UTC' }) : 'Sin fecha';
