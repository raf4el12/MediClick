export class PrescriptionEntity {
  id: number;
  appointmentId: number;
  instructions: string | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}
