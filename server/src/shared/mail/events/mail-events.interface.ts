export interface AppointmentConfirmedEvent {
  appointmentId: number;
  patientEmail: string;
  patientName: string;
  patientUserId: number;
  doctorName: string;
  specialty: string;
  clinicName: string;
  clinicTimezone: string;
  scheduleDate: Date;
  startTime: Date;
  endTime: Date;
}

export interface AppointmentCancelledEvent {
  appointmentId: number;
  patientEmail: string;
  patientName: string;
  patientUserId: number;
  doctorName: string;
  clinicName: string;
  clinicTimezone: string;
  scheduleDate: Date;
  cancelReason: string | null;
}

export interface PrescriptionCreatedEvent {
  prescriptionId: number;
  patientEmail: string;
  patientName: string;
  patientUserId: number;
  doctorName: string;
  clinicName: string;
  clinicTimezone: string;
  medications: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string | null;
  }>;
  instructions: string | null;
}
