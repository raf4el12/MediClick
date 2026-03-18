export interface CreateHolidayData {
  name: string;
  date: Date;
  year: number;
  isRecurring?: boolean;
  clinicId?: number;
}

export interface UpdateHolidayData {
  name?: string;
  date?: Date;
  year?: number;
  isRecurring?: boolean;
  isActive?: boolean;
}
