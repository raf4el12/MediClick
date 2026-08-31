import { AvailabilityChangeListener } from './availability-change.listener.js';
import type { AppointmentCancellationService } from '../services/appointment-cancellation.service.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { type AvailabilityRestrictionChangedEvent } from '../../../../shared/events/availability-events.interface.js';

describe('AvailabilityChangeListener', () => {
  let listener: AvailabilityChangeListener;
  let appointmentRepository: jest.Mocked<
    Pick<
      IAppointmentRepository,
      | 'findActiveByDoctorAndDateRange'
      | 'findActiveByDateRangeAndClinic'
      | 'update'
    >
  >;
  let holidayRepository: jest.Mocked<Pick<IHolidayRepository, 'isHoliday'>>;
  let scheduleBlockRepository: jest.Mocked<
    Pick<IScheduleBlockRepository, 'isBlocked'>
  >;
  let cancellationService: jest.Mocked<
    Pick<AppointmentCancellationService, 'cancel'>
  >;

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
        clinic: { id: 7, name: 'Clínica', timezone: 'America/Lima' },
      },
      specialty: { id: 2, name: 'Medicina' },
    },
    ...overrides,
  });

  const appointmentOn = (
    id: number,
    date: string,
  ): AppointmentWithRelations => {
    const appointment = buildAppointment({ id });
    return {
      ...appointment,
      schedule: {
        ...appointment.schedule,
        scheduleDate: new Date(`${date}T00:00:00.000Z`),
      },
    };
  };

  const restrictionEvent = (
    overrides: Partial<AvailabilityRestrictionChangedEvent> = {},
  ): AvailabilityRestrictionChangedEvent => ({
    restrictionType: 'SCHEDULE_BLOCK',
    restrictionId: 1,
    clinicId: 7,
    doctorId: 3,
    previousRange: null,
    currentRange: {
      startDate: new Date('2030-06-01T00:00:00.000Z'),
      endDate: new Date('2030-06-01T00:00:00.000Z'),
    },
    occurredAt: new Date(),
    actorId: 42,
    ...overrides,
  });

  beforeEach(() => {
    appointmentRepository = {
      findActiveByDoctorAndDateRange: jest.fn().mockResolvedValue([]),
      findActiveByDateRangeAndClinic: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockImplementation((id: number) =>
          Promise.resolve(
            buildAppointment({ id, status: AppointmentStatus.CANCELLED }),
          ),
        ),
    };
    holidayRepository = { isHoliday: jest.fn().mockResolvedValue(false) };
    scheduleBlockRepository = { isBlocked: jest.fn().mockResolvedValue(false) };
    cancellationService = { cancel: jest.fn().mockResolvedValue(undefined) };

    listener = new AvailabilityChangeListener(
      appointmentRepository as any,
      holidayRepository as any,
      scheduleBlockRepository as any,
      cancellationService as any,
    );
  });

  it('un bloqueo de día completo cancela sus citas aún bloqueadas y reofrece sus slots', async () => {
    appointmentRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      buildAppointment({ id: 100 }),
      buildAppointment({ id: 101 }),
    ]);
    scheduleBlockRepository.isBlocked.mockResolvedValue(true);

    await listener.handleAvailabilityRestrictionChanged(restrictionEvent());

    expect(cancellationService.cancel).toHaveBeenCalledTimes(2);
    expect(cancellationService.cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 100,
        reason: 'Bloqueo de agenda vigente',
        cancelledBy: 'SYSTEM_AVAILABILITY_RESTRICTION',
      }),
    );
  });

  it('un bloqueo horario solo cancela la cita que continúa solapándose', async () => {
    appointmentRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      buildAppointment({ id: 100 }),
      buildAppointment({
        id: 101,
        startTime: new Date('1970-01-01T11:00:00.000Z'),
        endTime: new Date('1970-01-01T11:30:00.000Z'),
      }),
    ]);
    scheduleBlockRepository.isBlocked.mockImplementation(
      (_doctorId, _date, startTime) =>
        Promise.resolve(startTime?.getUTCHours() === 9),
    );

    await listener.handleAvailabilityRestrictionChanged(restrictionEvent());

    expect(cancellationService.cancel).toHaveBeenCalledTimes(1);
    expect(cancellationService.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 100 }),
    );
  });

  it('un bloqueo movido cancela solo la cita que su estado final todavía invalida', async () => {
    appointmentRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      appointmentOn(100, '2030-06-01'),
      appointmentOn(101, '2030-06-03'),
    ]);
    scheduleBlockRepository.isBlocked.mockImplementation((_doctorId, date) =>
      Promise.resolve(date.toISOString().startsWith('2030-06-03')),
    );

    await listener.handleAvailabilityRestrictionChanged(
      restrictionEvent({
        previousRange: {
          startDate: new Date('2030-06-01T00:00:00.000Z'),
          endDate: new Date('2030-06-01T00:00:00.000Z'),
        },
        currentRange: {
          startDate: new Date('2030-06-03T00:00:00.000Z'),
          endDate: new Date('2030-06-03T00:00:00.000Z'),
        },
      }),
    );

    expect(
      appointmentRepository.findActiveByDoctorAndDateRange,
    ).toHaveBeenCalledWith(
      3,
      new Date('2030-06-01T00:00:00.000Z'),
      new Date('2030-06-03T00:00:00.000Z'),
    );
    expect(cancellationService.cancel).toHaveBeenCalledTimes(1);
    expect(cancellationService.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 101 }),
    );
  });

  it('un feriado movido cancela solo la cita de la fecha que sigue siendo feriada', async () => {
    appointmentRepository.findActiveByDateRangeAndClinic.mockResolvedValue([
      appointmentOn(200, '2030-06-01'),
      appointmentOn(201, '2030-06-03'),
    ]);
    holidayRepository.isHoliday.mockImplementation((date) =>
      Promise.resolve(date.toISOString().startsWith('2030-06-03')),
    );

    await listener.handleAvailabilityRestrictionChanged(
      restrictionEvent({
        restrictionType: 'HOLIDAY',
        doctorId: null,
        previousRange: {
          startDate: new Date('2030-06-01T12:00:00.000Z'),
          endDate: new Date('2030-06-01T12:00:00.000Z'),
        },
        currentRange: {
          startDate: new Date('2030-06-03T12:00:00.000Z'),
          endDate: new Date('2030-06-03T12:00:00.000Z'),
        },
      }),
    );

    expect(
      appointmentRepository.findActiveByDateRangeAndClinic,
    ).toHaveBeenCalledWith(
      new Date('2030-06-01T12:00:00.000Z'),
      new Date('2030-06-03T12:00:00.000Z'),
      7,
    );
    expect(cancellationService.cancel).toHaveBeenCalledTimes(1);
    expect(cancellationService.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 201 }),
    );
  });

  it('no reofrece una cita cuando ninguna candidata sigue afectada', async () => {
    appointmentRepository.findActiveByDoctorAndDateRange.mockResolvedValue([
      buildAppointment({ id: 100 }),
    ]);

    await listener.handleAvailabilityRestrictionChanged(restrictionEvent());

    expect(cancellationService.cancel).not.toHaveBeenCalled();
  });
});
