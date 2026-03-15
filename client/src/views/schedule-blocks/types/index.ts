export enum ScheduleBlockType {
  FULL_DAY = 'FULL_DAY',
  TIME_RANGE = 'TIME_RANGE',
}

export interface ScheduleBlockDoctor {
  id: number;
  profile: {
    name: string;
    lastName: string;
  };
}

export interface ScheduleBlock {
  id: number;
  doctorId: number;
  type: ScheduleBlockType;
  startDate: string;
  endDate: string;
  timeFrom: string | null;
  timeTo: string | null;
  reason: string;
  isActive: boolean;
  createdAt: string;
  doctor: ScheduleBlockDoctor;
}

export interface PaginatedScheduleBlocks {
  totalRows: number;
  rows: ScheduleBlock[];
  totalPages: number;
  currentPage: number;
}

export interface CreateScheduleBlockPayload {
  doctorId: number;
  type: ScheduleBlockType;
  startDate: string;
  endDate: string;
  timeFrom?: string;
  timeTo?: string;
  reason: string;
}

export interface UpdateScheduleBlockPayload {
  type?: ScheduleBlockType;
  startDate?: string;
  endDate?: string;
  timeFrom?: string;
  timeTo?: string;
  reason?: string;
}
