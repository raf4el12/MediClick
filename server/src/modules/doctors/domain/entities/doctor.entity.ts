export class DoctorEntity {
  id: number;
  profileId: number;
  licenseNumber: string;
  resume: string | null;
  maxOverbookPerDay: number;
  isActive: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
