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
    phone?: string;
    gender?: string;
  };
  doctor: {
    licenseNumber: string;
    resume?: string;
    clinicId?: number;
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
  clinic: {
    id: number;
    name: string;
    timezone: string;
    currency: string;
  } | null;
  specialties: Array<{
    specialty: { id: number; name: string };
  }>;
}
