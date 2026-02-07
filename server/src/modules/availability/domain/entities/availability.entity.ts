import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

export class AvailabilityEntity {
  id: number;
  doctorId: number;
  specialtyId: number;
  startDate: Date;
  endDate: Date;
  dayOfWeek: DayOfWeek;
  timeFrom: Date;
  timeTo: Date;
  isAvailable: boolean;
  type: AvailabilityType;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
