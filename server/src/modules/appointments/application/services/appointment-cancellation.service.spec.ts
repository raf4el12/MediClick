import { AppointmentCancellationService } from './appointment-cancellation.service.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

describe('AppointmentCancellationService', () => {
  let service: AppointmentCancellationService;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'cancelAtomically'>
  >;
  let eventEmitter: { emit: jest.Mock };

  const appointment: AppointmentWithRelations = {
    id: 50,
    patientId: 5,
    scheduleId: 20,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T09:30:00.000Z'),
    reason: 'Control',
    notes: null,
    status: AppointmentStatus.CANCELLED,
    paymentStatus: 'PAID',
    amount: 120,
    cancelReason: 'Bloqueo de agenda vigente',
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    clinicId: 7,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
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
  };

  beforeEach(() => {
    appointmentRepository = {
      cancelAtomically: jest.fn().mockResolvedValue({
        appointment,
        refundReviewTransactionId: 77,
        transitioned: true,
      }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new AppointmentCancellationService(
      appointmentRepository as unknown as IAppointmentRepository,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('marca revisión financiera y publica los efectos al cancelar una cita pagada por restricción', async () => {
    await service.cancel({
      appointmentId: 50,
      reason: 'Bloqueo de agenda vigente',
      cancelledBy: 'SYSTEM_AVAILABILITY_RESTRICTION',
    });

    const [cancelInput] = appointmentRepository.cancelAtomically.mock.calls[0];
    expect(cancelInput.appointmentId).toBe(50);
    expect(cancelInput.reason).toBe('Bloqueo de agenda vigente');
    expect(typeof cancelInput.eventIdentity.operationId).toBe('string');
    expect(typeof cancelInput.eventIdentity.cancelledEventId).toBe('string');
    expect(typeof cancelInput.eventIdentity.slotReleasedEventId).toBe('string');
    expect(cancelInput.eventIdentity.occurredAt).toBeInstanceOf(Date);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'appointment.cancelled',
      expect.objectContaining({ appointmentId: 50 }),
    );
  });

  it('no repite el evento local si la cita ya estaba cancelada', async () => {
    appointmentRepository.cancelAtomically.mockResolvedValue({
      appointment,
      refundReviewTransactionId: null,
      transitioned: false,
    });

    await service.cancel({
      appointmentId: 50,
      reason: 'ya cancelada',
      cancelledBy: 'RETRY',
    });

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
