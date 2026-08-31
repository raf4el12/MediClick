import { AppointmentCancellationService } from './appointment-cancellation.service.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import type { TransactionEntity } from '../../../payments/domain/entities/transaction.entity.js';
import type { UpdateTransactionData } from '../../../payments/domain/interfaces/transaction-data.interface.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { SLOT_RELEASED_EVENT } from '../../../../shared/events/availability-events.interface.js';

describe('AppointmentCancellationService', () => {
  let service: AppointmentCancellationService;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'update'>
  >;
  let transactionRepository: jest.Mocked<
    Pick<ITransactionRepository, 'findLatestByAppointmentId' | 'update'>
  >;
  let timezoneResolver: jest.Mocked<
    Pick<TimezoneResolverService, 'resolveClinicIdByDoctorId'>
  >;
  let eventEmitter: { emit: jest.Mock };
  let transactionUpdates: UpdateTransactionData[];

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

  const paidTransaction: TransactionEntity = {
    id: 77,
    appointmentId: 50,
    amount: 120,
    currency: 'PEN',
    paymentMethod: 'CREDIT_CARD',
    status: 'PAID',
    gatewayId: 'mp-77',
    preferenceId: null,
    externalRef: null,
    payerEmail: 'ana@x.com',
    failureReason: null,
    paidAt: new Date(),
    metadata: { paymentSource: 'Mercado Pago' },
    clinicId: 7,
    createdAt: new Date(),
    updatedAt: null,
  };

  beforeEach(() => {
    appointmentRepository = {
      update: jest.fn().mockResolvedValue(appointment),
    };
    transactionUpdates = [];
    transactionRepository = {
      findLatestByAppointmentId: jest.fn().mockResolvedValue(paidTransaction),
      update: jest
        .fn()
        .mockImplementation((_id: number, data: UpdateTransactionData) => {
          transactionUpdates.push(data);
          return Promise.resolve(paidTransaction);
        }),
    };
    timezoneResolver = {
      resolveClinicIdByDoctorId: jest.fn().mockResolvedValue(7),
    };
    eventEmitter = { emit: jest.fn() };

    service = new AppointmentCancellationService(
      appointmentRepository as any,
      transactionRepository as any,
      timezoneResolver as any,
      eventEmitter as any,
    );
  });

  it('marca revisión financiera y publica los efectos al cancelar una cita pagada por restricción', async () => {
    await service.cancel({
      appointmentId: 50,
      reason: 'Bloqueo de agenda vigente',
      cancelledBy: 'SYSTEM_AVAILABILITY_RESTRICTION',
    });

    expect(appointmentRepository.update).toHaveBeenCalledWith(
      50,
      expect.objectContaining({
        status: AppointmentStatus.CANCELLED,
        cancelReason: 'Bloqueo de agenda vigente',
      }),
    );
    expect(transactionRepository.update).toHaveBeenCalledWith(
      77,
      expect.anything(),
    );
    expect(transactionUpdates[0]?.metadata).toMatchObject({
      paymentSource: 'Mercado Pago',
      needsRefund: true,
      refundCancelReason: 'Bloqueo de agenda vigente',
      refundCancelledBy: 'SYSTEM_AVAILABILITY_RESTRICTION',
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      SLOT_RELEASED_EVENT,
      expect.objectContaining({ appointmentId: 50, clinicId: 7 }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'appointment.cancelled',
      expect.objectContaining({ appointmentId: 50 }),
    );
  });
});
