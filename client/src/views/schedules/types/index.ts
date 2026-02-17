export interface ScheduleDoctor {
  id: number;
  name: string;
  lastName: string;
}

export interface ScheduleSpecialty {
  id: number;
  name: string;
}

export interface Schedule {
  id: number;
  doctorId: number;
  specialtyId: number;
  scheduleDate: string;
  timeFrom: string;
  timeTo: string;
  createdAt: string;
  doctor: ScheduleDoctor;
  specialty: ScheduleSpecialty;
}

export interface GenerateSchedulesPayload {
  doctorId?: number;
  month: number;
  year: number;
}

export interface GenerateSchedulesResponse {
  generated: number;
  skipped: number;
  message: string;
}

export interface ScheduleFilters {
  doctorId?: number;
  specialtyId?: number;
  dateFrom?: string;
  dateTo?: string;
  onlyAvailable?: boolean;
}

// ── Calendar helpers ──

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MONTH_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export const WEEKDAY_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ── Week helpers ──

/** Get the Monday of the week that contains `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift so Monday=0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return 7 consecutive days starting from `monday`. */
export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Format "19 ene – 25 ene 2026" style range label. */
export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const d1 = monday.getDate();
  const m1 = MONTH_SHORT[monday.getMonth()];
  const d2 = sunday.getDate();
  const m2 = MONTH_SHORT[sunday.getMonth()];
  const yr = sunday.getFullYear();
  return `${d1} ${m1} – ${d2} ${m2} ${yr}`;
}

// ── Time helpers ──

/** Hours to display in the time grid (06:00 → 20:00). */
export const HOUR_SLOTS = Array.from({ length: 15 }, (_, i) => i + 6); // 6..20

/** Parse "HH:mm" → fractional hour, e.g. "08:30" → 8.5 */
export function parseTime(t: string): number {
  const parts = t.split(':').map(Number);
  return (parts[0] ?? 0) + (parts[1] ?? 0) / 60;
}

/** Assign a stable colour to a doctor id. */
const DOCTOR_COLORS: string[] = [
  '#e8f5e9', // green-50
  '#e3f2fd', // blue-50
  '#fce4ec', // pink-50
  '#fff8e1', // amber-50
  '#ede7f6', // deepPurple-50
  '#e0f2f1', // teal-50
  '#fff3e0', // orange-50
  '#f3e5f5', // purple-50
  '#e1f5fe', // lightBlue-50
  '#f1f8e9', // lightGreen-50
];

const DOCTOR_BORDER_COLORS: string[] = [
  '#a5d6a7',
  '#90caf9',
  '#f48fb1',
  '#ffe082',
  '#b39ddb',
  '#80cbc4',
  '#ffcc80',
  '#ce93d8',
  '#81d4fa',
  '#aed581',
];

const DOCTOR_TEXT_COLORS: string[] = [
  '#1b5e20',
  '#0d47a1',
  '#880e4f',
  '#e65100',
  '#311b92',
  '#004d40',
  '#bf360c',
  '#4a148c',
  '#01579b',
  '#33691e',
];

export function getDoctorColor(doctorId: number) {
  const idx = (doctorId - 1) % DOCTOR_COLORS.length;
  return {
    bg: DOCTOR_COLORS[idx],
    border: DOCTOR_BORDER_COLORS[idx],
    text: DOCTOR_TEXT_COLORS[idx],
  };
}

// ── Legacy helpers (still used elsewhere) ──

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
