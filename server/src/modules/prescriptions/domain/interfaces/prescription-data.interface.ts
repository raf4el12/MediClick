export interface CreatePrescriptionData {
  appointmentId: number;
  instructions?: string;
  validUntil?: Date;
  items: CreatePrescriptionItemData[];
  clinicId?: number | null;
}

export interface CreatePrescriptionItemData {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface PrescriptionForPdf {
  id: number;
  instructions: string | null;
  validUntil: Date | null;
  createdAt: Date;
  items: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string | null;
  }[];
  appointment: {
    patient: {
      id: number;
      profile: {
        name: string;
        lastName: string;
        numberDocument: string | null;
        typeDocument: string | null;
      };
    };
    schedule: {
      scheduleDate: Date;
      doctor: {
        licenseNumber: string;
        profile: { name: string; lastName: string };
        clinic: {
          name: string;
          address: string | null;
          phone: string | null;
        } | null;
      };
      specialty: { name: string };
    };
  };
}

export interface PrescriptionWithItems {
  id: number;
  appointmentId: number;
  instructions: string | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  items: {
    id: number;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string | null;
  }[];
  appointment: {
    id: number;
    status: string;
    patient: {
      id: number;
      profile: { name: string; lastName: string };
    };
    schedule: {
      scheduleDate: Date;
      doctor: {
        id: number;
        profile: { name: string; lastName: string };
      };
      specialty: { id: number; name: string };
    };
  };
}
