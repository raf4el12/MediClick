export interface ScheduleWithRelations {
  id: number;
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
  createdAt: Date;
  updatedAt: Date | null;
  doctor: {
    id: number;
    profile: { name: string; lastName: string };
    clinic: { timezone: string } | null;
  };
  specialty: { id: number; name: string };
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
 * Horario enriquecido con los rangos exactos de las citas activas ya agendadas.
 * Usado para calcular disponibilidad de slots dentro de un bloque horario.
 */
export interface ScheduleWithBookedSlots {
  id: number;
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
  bookedSlots: { startTime: Date; endTime: Date }[];
}
