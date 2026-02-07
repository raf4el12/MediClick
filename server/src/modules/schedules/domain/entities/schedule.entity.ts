export class ScheduleEntity {
  id: number;
  doctorId: number;
  specialtyId: number;
  scheduleDate: Date;
  timeFrom: Date;
  timeTo: Date;
  createdAt: Date;
  updatedAt: Date | null;
}
