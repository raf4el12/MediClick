export class PatientEntity {
  id: number;
  profileId: number;
  emergencyContact: string;
  bloodType: string;
  allergies: string | null;
  chronicConditions: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
