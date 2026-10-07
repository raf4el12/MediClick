export interface ScheduleWithRelations {
  id: number;
  doctorId: number;
  specialtyId: number;
  clinicId: number | null;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
  createdAt: Date;
  updatedAt: Date | null;
  doctor: {
    id: number;
    profile: { name: string; lastName: string };
    clinic: { id: number; timezone: string } | null;
  };
  specialty: {
    id: number;
    name: string;
    price: number | null;
    duration: number;
    bufferMinutes: number | null;
  };
}

export interface CreateScheduleData {
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
  clinicId?: number | null;
}

/**
 * Horario enriquecido con el estado de ocupación de su cita asociada.
 * Usado por el Use Case de consulta de time slots disponibles.
 */
export interface ScheduleWithAvailability {
  id: number;
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
  hasActiveAppointment: boolean;
}

/**
 * Bloque de agenda de un médico para una especialidad, sin sus citas: la
 * ocupación se calcula con todas las citas del médico (`DoctorBooking`).
 */
export interface ScheduleWindow {
  id: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
}

/**
 * Intervalo ocupado por una cita activa del médico, de cualquier especialidad.
 */
export interface DoctorBooking {
  scheduleDate: Date;
  startTime: Date;
  endTime: Date;
}
