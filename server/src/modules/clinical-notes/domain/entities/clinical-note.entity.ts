export class ClinicalNoteEntity {
  id: number;
  appointmentId: number;
  summary: string | null;
  plan: string | null;
  diagnosis: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
