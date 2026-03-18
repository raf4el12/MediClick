export class DoctorEntity {
  id: number;
  profileId: number;
  licenseNumber: string;
  resume: string | null;
  maxOverbookPerDay: number;
  clinicId: number | null;
  isActive: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
