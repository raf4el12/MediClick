export interface CreateClinicalNoteData {
  appointmentId: number;
  summary?: string;
  diagnosis?: string;
  plan?: string;
}

export interface ClinicalNoteWithAppointment {
  id: number;
  appointmentId: number;
  summary: string | null;
  plan: string | null;
  diagnosis: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  appointment: {
    id: number;
    status: string;
    patient: {
      id: number;
      profile: { name: string; lastName: string };
    };
    schedule: {
      scheduleDate: Date;
      doctor: {
        id: number;
        profile: { name: string; lastName: string };
      };
    };
  };
}
