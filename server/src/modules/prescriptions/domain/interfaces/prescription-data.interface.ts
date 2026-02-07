export interface CreatePrescriptionData {
  appointmentId: number;
  instructions?: string;
  validUntil?: Date;
  items: CreatePrescriptionItemData[];
}

export interface CreatePrescriptionItemData {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
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
