export interface CreatePatientData {
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
    birthday?: Date;
    gender?: string;
    typeDocument?: string;
    numberDocument?: string;
  };
  patient: {
    emergencyContact: string;
    bloodType: string;
    allergies?: string;
    chronicConditions?: string;
  };
}

export interface UpdatePatientData {
  profile?: {
    name?: string;
    lastName?: string;
    phone?: string;
    birthday?: Date;
    gender?: string;
    address?: string;
  };
  patient?: {
    emergencyContact?: string;
    bloodType?: string;
    allergies?: string;
    chronicConditions?: string;
  };
}

export interface PatientWithRelations {
  id: number;
  profileId: number;
  emergencyContact: string;
  bloodType: string;
  allergies: string | null;
  chronicConditions: string | null;
  isActive: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  profile: {
    id: number;
    name: string;
    lastName: string;
    email: string;
    phone: string | null;
    birthday: Date | null;
    gender: string | null;
    typeDocument: string | null;
    numberDocument: string | null;
    userId: number | null;
  };
}

export interface PatientWithHistory extends PatientWithRelations {
  appointments: {
    id: number;
    reason: string | null;
    status: string;
    createdAt: Date;
    schedule: {
      scheduleDate: Date;
      timeFrom: Date;
      timeTo: Date;
      doctor: {
        id: number;
        profile: { name: string; lastName: string };
      };
      specialty: { id: number; name: string };
    };
  }[];
}
