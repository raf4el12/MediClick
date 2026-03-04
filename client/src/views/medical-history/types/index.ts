export enum MedicalHistoryStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CHRONIC = 'CHRONIC',
}

export interface MedicalHistoryPatient {
  id: number;
  name: string;
  lastName: string;
}

export interface MedicalHistory {
  id: number;
  patientId: number;
  condition: string;
  description: string | null;
  diagnosedDate: string | null;
  status: MedicalHistoryStatus;
  notes: string | null;
  patient: MedicalHistoryPatient;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedMedicalHistory {
  data: MedicalHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MedicalHistoryQueryParams {
  status?: MedicalHistoryStatus;
  page?: number;
  limit?: number;
}

export interface CreateMedicalHistoryPayload {
  patientId: number;
  condition: string;
  description?: string;
  diagnosedDate?: string;
  status?: MedicalHistoryStatus;
  notes?: string;
}

export interface UpdateMedicalHistoryPayload {
  condition?: string;
  description?: string;
  diagnosedDate?: string;
  notes?: string;
}
