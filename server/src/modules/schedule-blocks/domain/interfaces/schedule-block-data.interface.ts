import { ScheduleBlockEntity } from '../entities/schedule-block.entity.js';

export interface CreateScheduleBlockData {
  doctorId: number;
  type: string;
  startDate: Date;
  endDate: Date;
  timeFrom?: Date;
  timeTo?: Date;
  reason: string;
}

export interface UpdateScheduleBlockData {
  type?: string;
  startDate?: Date;
  endDate?: Date;
  timeFrom?: Date | null;
  timeTo?: Date | null;
  reason?: string;
  isActive?: boolean;
}

export interface ScheduleBlockWithDoctor extends ScheduleBlockEntity {
  doctor: {
    id: number;
    clinicId: number | null;
    profile: {
      name: string;
      lastName: string;
    };
  };
}
