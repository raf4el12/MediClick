export class HolidayEntity {
  id: number;
  name: string;
  date: Date;
  year: number;
  isRecurring: boolean;
  isActive: boolean;
  clinicId: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}
