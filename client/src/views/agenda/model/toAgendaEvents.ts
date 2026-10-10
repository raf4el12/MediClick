import { AppointmentStatus } from '@/views/appointments/types';
import type { AgendaAppointment, AgendaBlock, AgendaCupo, AgendaEvent, AgendaHoliday, AgendaSnapshot } from '../types';

export interface AgendaEventOptions {
  statuses?: AppointmentStatus[];
  showFreeCupos?: boolean;
  specialtyId?: number;
  /** Agenda de una sede: el título lleva el médico antes del paciente. */
  withDoctor?: boolean;
  /** Disponibilidad: los bloqueos se pintan como eventos para poder tocarlos y editarlos. */
  blocksAsEvents?: boolean;
}

const MOVABLE: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
const isMovable = (a: AgendaAppointment) => MOVABLE.includes(a.status) && !a.isOverbook;

const at = (date: string, time: string) => `${date}T${time}:00`;

/** Suma días a una fecha `YYYY-MM-DD` en UTC, sin pasar por la zona del proceso. */
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
};

const appointmentEvent = (a: AgendaAppointment, doctorName?: string): AgendaEvent => ({
  id: `cita-${a.id}`,
  title: doctorName ? `${doctorName} · ${a.patient.fullName}` : a.patient.fullName,
  start: at(a.date, a.startTime),
  end: at(a.date, a.endTime),
  editable: isMovable(a),
  classNames: ['cita', `cita-${a.status.toLowerCase()}`],
  extendedProps: {
    kind: 'appointment',
    appointmentId: a.id,
    status: a.status,
    paymentStatus: a.paymentStatus,
    patientName: a.patient.fullName,
  },
});

const cupoEvent = (c: AgendaCupo): AgendaEvent => ({
  id: `cupo-${c.scheduleId}-${c.startTime}`,
  title: '',
  start: at(c.date, c.startTime),
  end: at(c.date, c.endTime),
  display: 'background',
  editable: false,
  classNames: ['cupo-libre'],
  extendedProps: { kind: 'cupo', scheduleId: c.scheduleId },
});

const daysBetween = (from: string, to: string) => {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);

  return days;
};

const blockEvents = (b: AgendaBlock): AgendaEvent[] => {
  const base = {
    title: b.reason,
    display: 'background' as const,
    editable: false,
    classNames: ['bloqueo'],
    extendedProps: { kind: 'block' as const, blockId: b.id },
  };

  const { timeFrom, timeTo } = b;
  if (b.type === 'TIME_RANGE' && timeFrom && timeTo) {
    return daysBetween(b.startDate, b.endDate).map((day) => ({
      ...base,
      id: `bloqueo-${b.id}-${day}`,
      start: at(day, timeFrom),
      end: at(day, timeTo),
    }));
  }

  return [{ ...base, id: `bloqueo-${b.id}`, start: b.startDate, end: addDays(b.endDate, 1), allDay: true }];
};

const holidayEvent = (h: AgendaHoliday): AgendaEvent => ({
  id: `feriado-${h.id}`,
  title: h.name,
  start: h.date,
  end: addDays(h.date, 1),
  allDay: true,
  display: 'background',
  editable: false,
  classNames: ['feriado'],
  extendedProps: { kind: 'holiday', holidayId: h.id },
});

/**
 * Convierte la agenda en eventos de FullCalendar. Las fechas van sin offset para usarse con
 * `timeZone: 'UTC'`: así el calendario pinta la hora local de la sede tal cual viene.
 */
export function toAgendaEvents(agenda: AgendaSnapshot, options: AgendaEventOptions = {}): AgendaEvent[] {
  const { statuses, showFreeCupos = false, specialtyId, withDoctor = false } = options;
  const doctorName = (id: number) => (withDoctor ? agenda.doctors.find((d) => d.id === id)?.fullName : undefined);
  const ofSpecialty = (item: { specialtyId: number }) => specialtyId === undefined || item.specialtyId === specialtyId;
  const appointments = agenda.appointments
    .filter((a) => ofSpecialty(a) && (!statuses || statuses.includes(a.status)))
    .map((a) => appointmentEvent(a, doctorName(a.doctorId)));
  const cupos = showFreeCupos ? agenda.cupos.filter((c) => c.available && ofSpecialty(c)).map(cupoEvent) : [];

  const blocks = agenda.blocks
    .flatMap(blockEvents)
    .map((e) => (options.blocksAsEvents ? { ...e, display: undefined, classNames: [...e.classNames, 'bloqueo-evento'] } : e));

  const holidays = agenda.holidays.map(holidayEvent);

  return [...holidays, ...blocks, ...cupos, ...appointments];
}
