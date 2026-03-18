export interface DoctorProfile {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: string | null;
}

export interface DoctorUser {
  id: number;
  name: string;
  email: string;
}

export interface DoctorSpecialty {
  id: number;
  name: string;
}

export interface DoctorClinic {
  id: number;
  name: string;
  timezone: string;
  currency: string;
}

export interface Doctor {
  id: number;
  licenseNumber: string;
  resume: string | null;
  clinicId: number | null;
  clinic: DoctorClinic | null;
  isActive: boolean;
  createdAt: string;
  profile: DoctorProfile;
  user: DoctorUser | null;
  specialties: DoctorSpecialty[];
}

export interface OnboardDoctorPayload {
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
  cmp: string;
  resume?: string;
  clinicId?: number;
  specialtyIds: number[];
}

export interface UpdateDoctorPayload {
  name?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  licenseNumber?: string;
  resume?: string;
  clinicId?: number;
  specialtyIds?: number[];
}
