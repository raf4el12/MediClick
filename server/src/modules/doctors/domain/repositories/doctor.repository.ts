import { DoctorEntity } from '../entities/doctor.entity.js';

export interface OnboardDoctorData {
  user: {
    name: string;
    email: string;
    password: string;
  };
  profile: {
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    gender?: string;
  };
  doctor: {
    licenseNumber: string;
    resume?: string;
  };
  specialtyIds: number[];
}

export interface DoctorWithRelations extends DoctorEntity {
  profile: {
    id: number;
    name: string;
    lastName: string;
    email: string;
    phone: string | null;
    gender: string | null;
    user: { id: number; name: string; email: string } | null;
  };
  specialties: Array<{
    specialty: { id: number; name: string };
  }>;
}

export interface IDoctorRepository {
  onboard(data: OnboardDoctorData): Promise<DoctorWithRelations>;
  findAll(): Promise<DoctorWithRelations[]>;
  findById(id: number): Promise<DoctorWithRelations | null>;
  existsByLicenseNumber(licenseNumber: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
}
