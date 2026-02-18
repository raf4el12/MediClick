export interface ClinicalNotePatient {
  id: number;
  name: string;
  lastName: string;
}

export interface ClinicalNote {
  id: number;
  appointmentId: number;
  summary: string | null;
  diagnosis: string | null;
  plan: string | null;
  patient: ClinicalNotePatient;
  scheduleDate: string;
  createdAt: string;
}

export interface CreateClinicalNotePayload {
  appointmentId: number;
  summary?: string;
  diagnosis?: string;
  plan?: string;
}
