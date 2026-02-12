export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum AvailabilityType {
  REGULAR = 'REGULAR',
  EXCEPTION = 'EXCEPTION',
  EXTRA = 'EXTRA',
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
  [DayOfWeek.SATURDAY]: 'Sábado',
  [DayOfWeek.SUNDAY]: 'Domingo',
};

export const ORDERED_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export interface AvailabilityDoctor {
  id: number;
  profile: { name: string; lastName: string };
}

export interface AvailabilitySpecialty {
  id: number;
  name: string;
}

export interface Availability {
  id: number;
  doctorId: number;
  specialtyId: number;
  startDate: string;
  endDate: string;
  dayOfWeek: DayOfWeek;
  timeFrom: string;
  timeTo: string;
  isAvailable: boolean;
  type: AvailabilityType;
  reason: string | null;
  createdAt: string;
  doctor: AvailabilityDoctor;
  specialty: AvailabilitySpecialty;
}

export interface CreateAvailabilityPayload {
  doctorId: number;
  specialtyId: number;
  startDate: string;
  endDate: string;
  dayOfWeek: DayOfWeek;
  timeFrom: string;
  timeTo: string;
  type: AvailabilityType;
  reason?: string;
}

export interface UpdateAvailabilityPayload {
  startDate?: string;
  endDate?: string;
  timeFrom?: string;
  timeTo?: string;
  isAvailable?: boolean;
  type?: AvailabilityType;
  reason?: string;
}

// Weekly schedule configurator types
export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export type WeeklySchedule = Record<DayOfWeek, DaySchedule>;

export function generateHours(from = 6, to = 20): string[] {
  const hours: string[] = [];

  for (let h = from; h <= to; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }

  return hours;
}

export const WEEKDAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

export function createDefaultSchedule(): WeeklySchedule {
  return ORDERED_DAYS.reduce((acc, day) => {
    const isWeekday = WEEKDAYS.includes(day);

    acc[day] = {
      enabled: isWeekday,
      slots: isWeekday ? [{ start: '08:00', end: '14:00' }] : [],
    };

    return acc;
  }, {} as WeeklySchedule);
}
