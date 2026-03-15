export class ScheduleBlockEntity {
  id: number;
  doctorId: number;
  type: string; // 'FULL_DAY' | 'TIME_RANGE'
  startDate: Date;
  endDate: Date;
  timeFrom: Date | null;
  timeTo: Date | null;
  reason: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
