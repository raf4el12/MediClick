export interface PatientRecordProfile {
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  typeDocument?: string;
  numberDocument?: string;
}

export interface PatientRecordMedicalHistory {
  condition: string;
  status?: string;
  notes?: string;
}

export interface PatientRecordClinicalNote {
  diagnosis?: string;
  plan?: string;
}

export interface PatientRecordDoctor {
  name: string;
  lastName: string;
}

export interface PatientRecordSchedule {
  doctor?: PatientRecordDoctor;
}

export interface PatientRecordAppointment {
  id: number;
  startTime: string;
  status: string;
  reason?: string;
  schedule?: PatientRecordSchedule;
  clinicalNotes?: PatientRecordClinicalNote[];
}

export interface PatientRecord {
  id: number;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  profile?: PatientRecordProfile;
  medicalHistory?: PatientRecordMedicalHistory[];
  appointments?: PatientRecordAppointment[];
}
