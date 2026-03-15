export class HolidayEntity {
  id: number;
  name: string;
  date: Date;
  year: number;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
