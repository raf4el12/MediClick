import { describe, expect, it } from 'vitest';
import { appointmentActions } from './appointmentActions';
import { AppointmentStatus, type Appointment } from '@/views/appointments/types';

// "Ahora": 20/10 a las 12:00 UTC (07:00 en Lima).
const now = new Date('2026-10-20T12:00:00.000Z');

const appointment = (overrides: Partial<Appointment> = {}): Appointment =>
  ({
    id: 1,
    patientId: 7,
    scheduleId: 3,
    startTime: '10:00', // 15:00 UTC en Lima
    endTime: '10:30',
    reason: null,
    notes: null,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: 'PAID',
    amount: 150,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    patient: { id: 7, name: 'Ana', lastName: 'Torres', email: 'ana@test.local' },
    schedule: {
      id: 3,
      scheduleDate: '2026-10-20T00:00:00.000Z',
      timeFrom: '08:00',
      timeTo: '12:00',
      doctor: { id: 4, name: 'Lucía', lastName: 'Paredes' },
      specialty: { id: 2, name: 'Cardiología' },
    },
    timezone: 'America/Lima',
    hasPrescription: false,
    notesCount: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }) as Appointment;

const actions = (a: Appointment, reviewed = false) => appointmentActions(a, { now, reviewed });

describe('appointmentActions', () => {
  it('una cita pendiente con plazo vigente se puede pagar, reagendar y cancelar', () => {
    expect(
      actions(appointment({ status: AppointmentStatus.PENDING, paymentStatus: 'PENDING', pendingUntil: '2026-10-20T12:10:00.000Z' })),
    ).toEqual(['pay', 'reschedule', 'cancel']);
  });

  it('con el plazo de pago vencido ya no se ofrece pagar', () => {
    expect(
      actions(appointment({ status: AppointmentStatus.PENDING, paymentStatus: 'PENDING', pendingUntil: '2026-10-20T11:50:00.000Z' })),
    ).not.toContain('pay');
  });

  it('una confirmada con seña se puede pagar (el saldo), reagendar y cancelar, y tiene comprobante', () => {
    expect(actions(appointment({ paymentStatus: 'PARTIAL' }))).toEqual(['pay', 'reschedule', 'cancel', 'receipt']);
  });

  it('una confirmada pagada ofrece el código de llegada, reagendar, cancelar y el comprobante', () => {
    expect(actions(appointment())).toEqual(['checkInQr', 'reschedule', 'cancel', 'receipt']);
  });

  it('una cita cuyo inicio ya pasó en la zona de su sede no se reagenda ni se cancela', () => {
    const started = actions(appointment({ startTime: '06:30' })); // 11:30 UTC
    expect(started).not.toContain('reschedule');
    expect(started).not.toContain('cancel');
  });

  it('una completada se reseña una sola vez y ofrece la receta si la hay', () => {
    const completed = appointment({ status: AppointmentStatus.COMPLETED, hasPrescription: true });
    expect(actions(completed)).toEqual(['review', 'prescription', 'receipt']);
    expect(actions(completed, true)).toEqual(['prescription', 'receipt']);
    expect(actions({ ...completed, hasPrescription: false })).toEqual(['review', 'receipt']);
  });

  it('una cancelada o una inasistencia solo ofrecen el comprobante si hubo un pago aprobado', () => {
    expect(actions(appointment({ status: AppointmentStatus.CANCELLED, paymentStatus: 'REFUNDED' }))).toEqual(['receipt']);
    expect(actions(appointment({ status: AppointmentStatus.NO_SHOW, paymentStatus: 'PAID' }))).toEqual(['receipt']);
    expect(actions(appointment({ status: AppointmentStatus.CANCELLED, paymentStatus: 'PENDING' }))).toEqual([]);
  });

  it('una cita en curso no ofrece acciones al paciente', () => {
    expect(actions(appointment({ status: AppointmentStatus.IN_PROGRESS }))).toEqual([]);
  });
});
