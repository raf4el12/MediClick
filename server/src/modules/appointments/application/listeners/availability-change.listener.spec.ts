import { AvailabilityChangeListener } from './availability-change.listener.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import {
  SLOT_RELEASED_EVENT,
  type ScheduleBlockedEvent,
  type HolidayCreatedEvent,
} from '../../../../shared/events/availability-events.interface.js';

describe('AvailabilityChangeListener', () => {
  let listener: AvailabilityChangeListener;
  let appointmentRepository: jest.Mocked<
    Pick<
      IAppointmentRepository,
      'findActiveByDoctorAndDateRange' | 'findActiveByDateAndClinic' | 'update'
    >
  >;
  let eventEmitter: { emit: jest.Mock };

  const buildAppointment = (
    overrides: Partial<AppointmentWithRelations> = {},
  ): AppointmentWithRelations => ({
    id: 100,
    patientId: 5,
    scheduleId: 20,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T09:30:00.000Z'),
    reason: 'Control',
    notes: null,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: 'PAID',
    amount: 120,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    clinicId: 7,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
    hasPrescription: false,
    notesCount: 0,
    patient: {
      id: 5,
      profile: {
        name: 'Ana',
        lastName: 'Gómez',
        email: 'ana@x.com',
        userId: 42,
      },
    },
    schedule: {
      id: 20,
      scheduleDate: new Date('2030-06-01T00:00:00.000Z'),
      timeFrom: new Date('1970-01-01T08:00:00.000Z'),
      timeTo: new Date('1970-01-01T17:00:00.000Z'),
      doctor: {
        id: 3,
        profile: { name: 'Dr', lastName: 'House' },
        clinic: { name: 'Clínica', timezone: 'America/Lima' },
      },
      specialty: { id: 2, name: 'Medicina' },
    },
    ...overrides,
  });

  beforeEach(() => {
    appointmentRepository = {
      findActiveByDoctorAndDateRange: jest.fn().mockResolvedValue([]),
      findActiveByDateAndClinic: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockImplementation((id: number) =>
          Promise.resolve(
            buildAppointment({ id, status: AppointmentStatus.CANCELLED }),
          ),
        ),
    };
    eventEmitter = { emit: jest.fn() };

    listener = new AvailabilityChangeListener(
      appointmentRepository as any,
      eventEmitter as any,
    );
  });

  const blockEvent = (
    overrides: Partial<ScheduleBlockedEvent> = {},
  ): ScheduleBlockedEvent => ({
    doctorId: 3,
    startDate: new Date('2030-06-01T00:00:00.000Z'),
    endDate: new Date('2030-06-01T00:00:00.000Z'),
    type: 'FULL_DAY',
    timeFrom: null,
    timeTo: null,
    reason: 'Vacaciones',
    ...overrides,
  });

  // ── schedule.blocked ──────────────────────────────────────────────────────

  it('FULL_DAY: cancela todas las citas del doctor en el rango y reofrece el slot', async () => {
    appointmentRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      buildAppointment({ id: 100 }),
      buildAppointment({ id: 101 }),
    ]);

    await listener.handleScheduleBlocked(blockEvent());

    expect(appointmentRepository.update).toHaveBeenCalledTimes(2);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ status: AppointmentStatus.CANCELLED }),
    );
    // Por cada cita: slot_released (waitlist) + appointment.cancelled (mail)
    expect(eventEmitter.emit).toHaveBeenCalledTimes(4);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      SLOT_RELEASED_EVENT,
      expect.objectContaining({ scheduleId: 20, clinicId: 7 }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'appointment.cancelled',
      expect.objectContaining({ scheduleId: 20, clinicId: 7 }),
    );
  });

  it('TIME_RANGE: solo cancela las citas que solapan la franja bloqueada', async () => {
    appointmentRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      // 09:00-09:30 → solapa con 09:00-10:00
      buildAppointment({ id: 100 }),
      // 11:00-11:30 → fuera de la franja
      buildAppointment({
        id: 101,
        startTime: new Date('1970-01-01T11:00:00.000Z'),
        endTime: new Date('1970-01-01T11:30:00.000Z'),
      }),
    ]);

    await listener.handleScheduleBlocked(
      blockEvent({
        type: 'TIME_RANGE',
        timeFrom: new Date('1970-01-01T09:00:00.000Z'),
        timeTo: new Date('1970-01-01T10:00:00.000Z'),
      }),
    );

    expect(appointmentRepository.update).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      100,
      expect.anything(),
    );
  });

  it('cita sin usuario asociado: reofrece el slot pero no emite el mail de cancelación', async () => {
    appointmentRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      buildAppointment({ id: 100 }),
    ]);
    appointmentRepository.update.mockResolvedValue(
      buildAppointment({
        id: 100,
        status: AppointmentStatus.CANCELLED,
        patient: {
          id: 5,
          profile: {
            name: 'Walk',
            lastName: 'In',
            email: '',
            userId: null,
          },
        },
      }),
    );

    await listener.handleScheduleBlocked(blockEvent());

    expect(appointmentRepository.update).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      SLOT_RELEASED_EVENT,
      expect.objectContaining({ appointmentId: 100 }),
    );
  });

  it('no hace nada si no hay citas afectadas', async () => {
    await listener.handleScheduleBlocked(blockEvent());

    expect(appointmentRepository.update).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  // ── holiday.created ───────────────────────────────────────────────────────

  it('feriado: cancela las citas de la fecha y reofrece los slots', async () => {
    appointmentRepository.findActiveByDateAndClinic.mockResolvedValue([
      buildAppointment({ id: 200 }),
    ]);

    const event: HolidayCreatedEvent = {
      date: new Date('2030-06-01T12:00:00.000Z'),
      clinicId: 7,
      name: 'Día de la Independencia',
    };

    await listener.handleHolidayCreated(event);

    expect(
      appointmentRepository.findActiveByDateAndClinic,
    ).toHaveBeenCalledWith(event.date, 7);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        status: AppointmentStatus.CANCELLED,
        cancelReason: expect.stringContaining('Día de la Independencia'),
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'appointment.cancelled',
      expect.objectContaining({ appointmentId: 200 }),
    );
  });
});
