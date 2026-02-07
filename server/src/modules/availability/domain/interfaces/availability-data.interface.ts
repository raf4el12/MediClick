import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

export interface CreateAvailabilityData {
  doctorId: number;
  specialtyId: number;
  startDate: Date;
  endDate: Date;
  dayOfWeek: DayOfWeek;
  timeFrom: Date;
  timeTo: Date;
  type: AvailabilityType;
  reason?: string;
}

export interface UpdateAvailabilityData {
  startDate?: Date;
  endDate?: Date;
  timeFrom?: Date;
  timeTo?: Date;
  isAvailable?: boolean;
  type?: AvailabilityType;
  reason?: string;
}

export interface AvailabilityWithRelations {
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
  doctor: {
    id: number;
    profile: { name: string; lastName: string };
  };
  specialty: { id: number; name: string };
}
