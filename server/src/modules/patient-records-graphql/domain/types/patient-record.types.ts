export interface PatientProfile {
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  typeDocument?: string;
  numberDocument?: string;
}

export interface PatientMedicalHistory {
  condition: string;
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
  profile?: PatientProfile;
  medicalHistory?: PatientMedicalHistory[];
  appointments?: PatientAppointment[];
}
