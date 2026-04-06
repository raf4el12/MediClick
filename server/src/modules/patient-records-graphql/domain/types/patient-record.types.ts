export interface PatientProfile {
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  birthday?: Date;
  gender?: string;
  address?: string;
  typeDocument?: string;
  numberDocument?: string;
}

export interface PatientMedicalHistory {
  condition: string;
  description?: string;
  diagnosedDate?: Date;
  status?: string;
  notes?: string;
}

export interface PatientClinicalNote {
  diagnosis?: string;
  plan?: string;
}

export interface AppointmentDoctor {
  name: string;
  lastName: string;
}

export interface AppointmentSchedule {
  doctor?: AppointmentDoctor;
}

export interface PatientAppointment {
  id: number;
  startTime: Date;
  status: string;
  reason?: string;
  schedule?: AppointmentSchedule;
  clinicalNotes?: PatientClinicalNote[];
}

export interface PatientRecord {
  id: number;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContact?: string;
  isActive: boolean;
  profile?: PatientProfile;
  medicalHistory?: PatientMedicalHistory[];
  appointments?: PatientAppointment[];
}
