export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface AppointmentDoctor {
  id: number;
  name: string;
  lastName: string;
}

export interface AppointmentSpecialty {
  id: number;
  name: string;
}

export interface AppointmentSchedule {
  id: number;
  scheduleDate: string;
  timeFrom: string;
  timeTo: string;
  doctor: AppointmentDoctor;
  specialty: AppointmentSpecialty;
}

export interface AppointmentPatient {
  id: number;
  name: string;
  lastName: string;
  email: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  scheduleId: number;
  startTime: string;    // HH:mm
  endTime: string;      // HH:mm
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  paymentStatus: string;
  amount: number | null;
  cancelReason: string | null;
  cancellationFee: number | null;
  isOverbook: boolean;
  pendingUntil: string | null;
  patient: AppointmentPatient;
  schedule: AppointmentSchedule;
  timezone: string;     // IANA timezone de la clínica del doctor
  hasPrescription: boolean;
  notesCount: number;
  createdAt: string;
  /** Sede de la cita; la exponen los endpoints del paciente (`/appointments/my*`). */
  clinic?: AppointmentClinic | null;
}

export interface AppointmentClinic {
  id: number;
  name: string;
  address: string | null;
  currency: string;
}

/** `GET /appointments/my/summary` */
export interface MyAppointmentsSummary {
  nextAppointment: Appointment | null;
  upcomingCount: number;
  awaitingPaymentCount: number;
  earliestPaymentDeadline: string | null;
  completedCount: number;
  pendingReviewCount: number;
}

/** `GET /appointments/:id/cancellation-preview` */
export interface CancellationPreview {
  fee: number;
  currency: string;
  freeCancellationWindowHours: number;
  hoursUntilAppointment: number;
  cancellable: boolean;
}

export interface CreateAppointmentPayload {
  patientId: number;
  scheduleId: number;
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  reason?: string;
}

export interface CancelAppointmentPayload {
  reason: string;
}

export interface RescheduleAppointmentPayload {
  newScheduleId: number;
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  reason?: string;
}

export interface AppointmentFilters {
  dateFrom?: string;
  dateTo?: string;
  doctorId?: number;
  specialtyId?: number;
  status?: AppointmentStatus;
}

export interface PatientAppointmentFilters {
  status?: AppointmentStatus;
  upcoming?: boolean;
}

export interface CreatePatientAppointmentPayload {
  scheduleId: number;
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  reason?: string;
}

export interface CreateOverbookPayload {
  patientId: number;
  doctorId: number;
  specialtyId: number;
  date: string;       // YYYY-MM-DD
  reason?: string;
}
