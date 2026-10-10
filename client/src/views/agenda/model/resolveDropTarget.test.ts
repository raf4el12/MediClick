import { afterEach, describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/views/appointments/types';
import type { AgendaAppointment, AgendaCupo, AgendaSnapshot } from '../types';
import { resolveDropTarget } from './resolveDropTarget';

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

/** Cita de Ana con Lucía (médico 12) en Cardiología (2), hoy a las 09:00 en el horario 40. */
const ana: AgendaAppointment = {
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
};

const agendaWith = (cupos: AgendaCupo[]): AgendaSnapshot => ({
  timezone: 'America/Lima',
  range: { from: '2026-10-05', to: '2026-10-11' },
  doctors: [],
  cupos,
  appointments: [ana],
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
});

/** Instante tal como lo entrega FullCalendar con `timeZone: 'UTC'`: la hora UTC es la hora de la sede. */
const dropAt = (date: string, time: string) => new Date(`${date}T${time}:00Z`);

describe('resolveDropTarget', () => {
  it('soltar dentro de un cupo libre del mismo médico y especialidad da ese cupo', () => {
    const agenda = agendaWith([cupo({ scheduleId: 41, startTime: '10:00', endTime: '10:30' })]);

    expect(resolveDropTarget(agenda, 101, dropAt('2026-10-05', '10:15'))).toEqual({
      scheduleId: 41,
      startTime: '10:00',
      endTime: '10:30',
    });
  });

  it('un cupo libre de otra especialidad o de otro médico no recibe la cita', () => {
    const otraEspecialidad = agendaWith([cupo({ scheduleId: 50, specialtyId: 1 })]);
    const otroMedico = agendaWith([cupo({ scheduleId: 60, doctorId: 13 })]);

    expect(resolveDropTarget(otraEspecialidad, 101, dropAt('2026-10-05', '10:00'))).toBeNull();
    expect(resolveDropTarget(otroMedico, 101, dropAt('2026-10-05', '10:00'))).toBeNull();
  });

  it('un cupo ocupado, bloqueado o de feriado no recibe la cita', () => {
    const agenda = agendaWith([cupo({ scheduleId: 41, available: false })]);

    expect(resolveDropTarget(agenda, 101, dropAt('2026-10-05', '10:00'))).toBeNull();
  });

  it('soltar sobre el cupo de origen no es un cambio', () => {
    const agenda = agendaWith([cupo({ scheduleId: 40, startTime: '09:00', endTime: '09:30' })]);

    expect(resolveDropTarget(agenda, 101, dropAt('2026-10-05', '09:10'))).toBeNull();
  });

  it('soltar en un instante sin cupo no recibe la cita', () => {
    const agenda = agendaWith([cupo({ scheduleId: 41, startTime: '10:00', endTime: '10:30' })]);

    expect(resolveDropTarget(agenda, 101, dropAt('2026-10-05', '10:30'))).toBeNull();
    expect(resolveDropTarget(agenda, 101, dropAt('2026-10-06', '10:00'))).toBeNull();
  });

  describe('zona horaria del navegador', () => {
    const original = process.env.TZ;
    afterEach(() => {
      process.env.TZ = original;
    });

    it('la hora se lee igual en Tokio, donde 23:45 UTC ya es el día siguiente', () => {
      process.env.TZ = 'Asia/Tokyo';
      const agenda = agendaWith([cupo({ scheduleId: 41, startTime: '23:30', endTime: '23:59' })]);

      expect(resolveDropTarget(agenda, 101, dropAt('2026-10-05', '23:45'))).toEqual({
        scheduleId: 41,
        startTime: '23:30',
        endTime: '23:59',
      });
    });
  });
});
