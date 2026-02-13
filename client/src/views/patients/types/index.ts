export interface PatientProfile {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  gender: string | null;
  typeDocument: string | null;
  numberDocument: string | null;
}

export interface Patient {
  id: number;
  emergencyContact: string;
  bloodType: string;
  allergies: string | null;
  chronicConditions: string | null;
  isActive: boolean;
  createdAt: string;
  profile: PatientProfile;
}

export interface CreatePatientPayload {
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  birthday?: string;
  gender?: string;
  typeDocument?: string;
  numberDocument?: string;
  emergencyContact: string;
  bloodType: string;
  allergies?: string;
  chronicConditions?: string;
}

export interface UpdatePatientPayload {
  name?: string;
  lastName?: string;
  phone?: string;
  birthday?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
}
