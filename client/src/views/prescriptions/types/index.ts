export interface PrescriptionItem {
  id: number;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
}

export interface PrescriptionPatient {
  id: number;
  name: string;
  lastName: string;
}

export interface PrescriptionDoctor {
  id: number;
  name: string;
  lastName: string;
}

export interface Prescription {
  id: number;
  appointmentId: number;
  instructions: string | null;
  validUntil: string | null;
  items: PrescriptionItem[];
  patient: PrescriptionPatient;
  doctor: PrescriptionDoctor;
  specialtyName: string;
  scheduleDate: string;
  appointmentStatus: string;
  createdAt: string;
}

export interface PrescriptionItemPayload {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface CreatePrescriptionPayload {
  appointmentId: number;
  instructions?: string;
  validUntil?: string;
  items: PrescriptionItemPayload[];
}
