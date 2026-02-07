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
  };
  specialty: { id: number; name: string };
}

export interface CreateScheduleData {
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
}
