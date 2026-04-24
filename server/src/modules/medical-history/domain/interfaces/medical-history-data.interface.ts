export interface CreateMedicalHistoryData {
  patientId: number;
  condition: string;
  description?: string;
  diagnosedDate?: Date;
  status?: string;
  notes?: string;
  clinicId?: number | null;
}

export interface UpdateMedicalHistoryData {
  condition?: string;
  description?: string;
  diagnosedDate?: Date;
  notes?: string;
}

export interface MedicalHistoryResult {
  id: number;
  patientId: number;
  condition: string;
  description: string | null;
  diagnosedDate: Date | null;
  status: string;
  notes: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  patient: {
    id: number;
    profile: {
      name: string;
      lastName: string;
    };
  };
}

export interface MedicalHistoryFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedMedicalHistory {
  data: MedicalHistoryResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
