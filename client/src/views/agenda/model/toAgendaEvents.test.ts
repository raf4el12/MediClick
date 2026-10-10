import { afterEach, describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/views/appointments/types';
import type { AgendaAppointment, AgendaCupo, AgendaSnapshot } from '../types';
import { toAgendaEvents } from './toAgendaEvents';

const appointment = (overrides: Partial<AgendaAppointment> = {}): AgendaAppointment => ({
  id: 101,
  scheduleId: 40,
  doctorId: 12,
  specialtyId: 2,
  date: '2026-10-05',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.CONFIRMED,
  paymentStatus: 'PAID',
  isOverbook: false,
  isAtRisk: false,
  patient: { id: 100, fullName: 'Ana Torres' },
  ...overrides,
});

const cupo = (overrides: Partial<AgendaCupo> = {}): AgendaCupo => ({
  scheduleId: 40,
  doctorId: 12,
  specialtyId: 2,
  date: '2026-10-05',
  startTime: '10:00',
  endTime: '10:30',
  available: true,
  ...overrides,
});

const snapshot = (overrides: Partial<AgendaSnapshot> = {}): AgendaSnapshot => ({
  timezone: 'America/Lima',
  range: { from: '2026-10-05', to: '2026-10-11' },
  doctors: [{ id: 12, fullName: 'Lucía Paredes', specialties: [{ id: 2, name: 'Cardiología' }] }],
  cupos: [],
  appointments: [],
  blocks: [],
  holidays: [],
  indicators: {
    totalCupos: 0,
    bookedCupos: 0,
    occupancyRate: 0,
    byStatus: { PENDING: 0, CONFIRMED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 },
    atRisk: 0,
    pendingPayment: 0,
  },
  ...overrides,
});

describe('toAgendaEvents', () => {
  it('una cita confirmada es un evento con la hora local de la sede, sin offset', () => {
    const [event] = toAgendaEvents(snapshot({ appointments: [appointment()] }));

    expect(event).toMatchObject({
      id: 'cita-101',
      title: 'Ana Torres',
      start: '2026-10-05T09:00:00',
      end: '2026-10-05T09:30:00',
      classNames: expect.arrayContaining(['cita', 'cita-confirmed']),
      extendedProps: {
        kind: 'appointment',
        appointmentId: 101,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        patientName: 'Ana Torres',
      },
    });
  });

  it('solo las citas pendientes y confirmadas que no son sobrecupo se pueden arrastrar', () => {
    const editable = (overrides: Partial<AgendaAppointment>) =>
      toAgendaEvents(snapshot({ appointments: [appointment(overrides)] }))[0]!.editable;

    expect(editable({ status: AppointmentStatus.PENDING })).toBe(true);
    expect(editable({ status: AppointmentStatus.CONFIRMED })).toBe(true);
    expect(editable({ status: AppointmentStatus.IN_PROGRESS })).toBe(false);
    expect(editable({ status: AppointmentStatus.COMPLETED })).toBe(false);
    expect(editable({ status: AppointmentStatus.CANCELLED })).toBe(false);
    expect(editable({ status: AppointmentStatus.NO_SHOW })).toBe(false);
    expect(editable({ status: AppointmentStatus.CONFIRMED, isOverbook: true })).toBe(false);
  });

  it('el filtro de estados deja solo las citas elegidas', () => {
    const agenda = snapshot({
      appointments: [
        appointment({ id: 1, status: AppointmentStatus.CONFIRMED }),
        appointment({ id: 2, status: AppointmentStatus.CANCELLED }),
        appointment({ id: 3, status: AppointmentStatus.COMPLETED }),
      ],
    });

    const ids = toAgendaEvents(agenda, { statuses: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] }).map((e) => e.id);

    expect(ids).toEqual(['cita-1', 'cita-3']);
  });

  it('con cupos libres visibles, cada cupo libre es un fondo no editable y el ocupado no se pinta', () => {
    const agenda = snapshot({ cupos: [cupo(), cupo({ startTime: '10:30', endTime: '11:00', available: false })] });

    expect(toAgendaEvents(agenda)).toEqual([]);
    expect(toAgendaEvents(agenda, { showFreeCupos: true })).toEqual([
      {
        id: 'cupo-40-10:00',
        title: '',
        start: '2026-10-05T10:00:00',
        end: '2026-10-05T10:30:00',
        display: 'background',
        editable: false,
        classNames: ['cupo-libre'],
        extendedProps: { kind: 'cupo', scheduleId: 40 },
      },
    ]);
  });

  it('un bloqueo de día completo de tres días es un solo fondo de día entero con fin exclusivo', () => {
    const agenda = snapshot({
      blocks: [
        { id: 7, doctorId: 12, type: 'FULL_DAY', startDate: '2026-10-29', endDate: '2026-10-31', timeFrom: null, timeTo: null, reason: 'Congreso' },
      ],
    });

    expect(toAgendaEvents(agenda)).toEqual([
      {
        id: 'bloqueo-7',
        title: 'Congreso',
        start: '2026-10-29',
        end: '2026-11-01',
        allDay: true,
        display: 'background',
        editable: false,
        classNames: ['bloqueo'],
        extendedProps: { kind: 'block', blockId: 7 },
      },
    ]);
  });

  it('un bloqueo por horas de dos días es un fondo por día con su franja horaria', () => {
    const agenda = snapshot({
      blocks: [
        { id: 8, doctorId: 12, type: 'TIME_RANGE', startDate: '2026-10-05', endDate: '2026-10-06', timeFrom: '14:00', timeTo: '16:00', reason: 'Reunión' },
      ],
    });

    expect(toAgendaEvents(agenda).map(({ id, start, end, allDay }) => ({ id, start, end, allDay }))).toEqual([
      { id: 'bloqueo-8-2026-10-05', start: '2026-10-05T14:00:00', end: '2026-10-05T16:00:00', allDay: undefined },
      { id: 'bloqueo-8-2026-10-06', start: '2026-10-06T14:00:00', end: '2026-10-06T16:00:00', allDay: undefined },
    ]);
  });

  it('los feriados globales y de la sede son fondos de día entero con su nombre', () => {
    const agenda = snapshot({
      holidays: [
        { id: 3, date: '2026-10-08', name: 'Combate de Angamos', scope: 'GLOBAL' },
        { id: 4, date: '2026-10-09', name: 'Aniversario de la sede', scope: 'CLINIC' },
      ],
    });

    expect(toAgendaEvents(agenda)).toEqual([
      {
        id: 'feriado-3',
        title: 'Combate de Angamos',
        start: '2026-10-08',
        end: '2026-10-09',
        allDay: true,
        display: 'background',
        editable: false,
        classNames: ['feriado'],
        extendedProps: { kind: 'holiday', holidayId: 3 },
      },
      {
        id: 'feriado-4',
        title: 'Aniversario de la sede',
        start: '2026-10-09',
        end: '2026-10-10',
        allDay: true,
        display: 'background',
        editable: false,
        classNames: ['feriado'],
        extendedProps: { kind: 'holiday', holidayId: 4 },
      },
    ]);
  });

  describe('zona horaria del proceso', () => {
    const original = process.env.TZ;
    afterEach(() => {
      process.env.TZ = original;
    });

    it('el mismo snapshot da la misma salida en Lima y en Tokio', () => {
      const agenda = snapshot({
        appointments: [appointment({ date: '2026-10-31', startTime: '23:30', endTime: '23:59' })],
        cupos: [cupo({ date: '2026-10-31' })],
        blocks: [
          { id: 7, doctorId: 12, type: 'FULL_DAY', startDate: '2026-10-30', endDate: '2026-10-31', timeFrom: null, timeTo: null, reason: 'Congreso' },
          { id: 8, doctorId: 12, type: 'TIME_RANGE', startDate: '2026-10-31', endDate: '2026-11-01', timeFrom: '08:00', timeTo: '09:00', reason: 'Reunión' },
        ],
        holidays: [{ id: 3, date: '2026-10-31', name: 'Feriado', scope: 'GLOBAL' }],
      });

      process.env.TZ = 'America/Lima';
      const lima = toAgendaEvents(agenda, { showFreeCupos: true });
      process.env.TZ = 'Asia/Tokyo';
      const tokio = toAgendaEvents(agenda, { showFreeCupos: true });

      expect(tokio).toEqual(lima);
      expect(lima.find((e) => e.id === 'bloqueo-7')?.end).toBe('2026-11-01');
      expect(lima.find((e) => e.id === 'bloqueo-8-2026-11-01')?.start).toBe('2026-11-01T08:00:00');
    });
  });

  it('el filtro de especialidad deja solo sus citas y sus cupos libres', () => {
    const agenda = snapshot({
      appointments: [appointment({ id: 1, specialtyId: 2 }), appointment({ id: 2, specialtyId: 1 })],
      cupos: [cupo({ specialtyId: 2 }), cupo({ specialtyId: 1, startTime: '11:00', endTime: '11:30' })],
    });

    const ids = toAgendaEvents(agenda, { specialtyId: 1, showFreeCupos: true }).map((e) => e.id);

    expect(ids).toEqual(['cupo-40-11:00', 'cita-2']);
  });

  it('en la agenda de una sede el título lleva el médico antes del paciente', () => {
    const [event] = toAgendaEvents(snapshot({ appointments: [appointment()] }), { withDoctor: true });

    expect(event!.title).toBe('Lucía Paredes · Ana Torres');
  });

  it('en disponibilidad los bloqueos son eventos que se pueden tocar, no fondos', () => {
    const agenda = snapshot({
      blocks: [{ id: 8, doctorId: 12, type: 'TIME_RANGE', startDate: '2026-10-05', endDate: '2026-10-05', timeFrom: '14:00', timeTo: '16:00', reason: 'Reunión' }],
    });

    const [event] = toAgendaEvents(agenda, { blocksAsEvents: true });

    expect(event).toMatchObject({ id: 'bloqueo-8-2026-10-05', title: 'Reunión', editable: false, classNames: ['bloqueo', 'bloqueo-evento'] });
    expect(event!.display).toBeUndefined();
  });
});
