export interface Holiday {
  id: number;
  name: string;
  date: string;
  year: number;
  isRecurring: boolean;
  isActive: boolean;
  clinicId: number | null;
  createdAt: string;
}

export interface PaginatedHolidays {
  totalRows: number;
  rows: Holiday[];
  totalPages: number;
  currentPage: number;
}

export interface CreateHolidayPayload {
  name: string;
  date: string;
  isRecurring?: boolean;
  clinicId?: number;
}

export interface UpdateHolidayPayload {
  name?: string;
  date?: string;
  isRecurring?: boolean;
  isActive?: boolean;
  clinicId?: number;
}

export interface SeedHolidaysResponse {
  seeded: number;
  year: number;
  message: string;
}
