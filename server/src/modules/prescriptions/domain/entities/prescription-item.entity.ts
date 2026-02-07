export class PrescriptionItemEntity {
  id: number;
  prescriptionId: number;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
}
