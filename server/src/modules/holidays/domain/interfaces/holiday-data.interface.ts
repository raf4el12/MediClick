export interface CreateHolidayData {
  name: string;
  date: Date;
  year: number;
  isRecurring?: boolean;
}

export interface UpdateHolidayData {
  name?: string;
  date?: Date;
  year?: number;
  isRecurring?: boolean;
  isActive?: boolean;
}
