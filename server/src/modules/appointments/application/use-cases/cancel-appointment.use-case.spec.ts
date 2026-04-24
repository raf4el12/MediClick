import { CancelAppointmentUseCase } from './cancel-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

describe('CancelAppointmentUseCase — refund flagging', () => {
  let useCase: CancelAppointmentUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findById' | 'update'>
  >;
  let specialtyRepository: jest.Mocked<Pick<ISpecialtyRepository, 'findById'>>;
  let transactionRepository: jest.Mocked<ITransactionRepository>;
  let timezoneResolver: jest.Mocked<
    Pick<TimezoneResolverService, 'resolveByDoctorId'>
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const buildAppointment = () => ({
    id: 50,
    patientId: 1,
    scheduleId: 10,
    startTime: new Date('2026-12-01T10:00:00Z'),
    endTime: new Date('2026-12-01T10:30:00Z'),
    status: 'PENDING',
    patient: {
      id: 1,
      profile: {
        name: 'Ana',
        lastName: 'Gómez',
        email: 'ana@x.com',
        userId: 42,
      },
    },
    schedule: {
      id: 10,
      scheduleDate: new Date('2026-12-01T00:00:00Z'),
      timeFrom: new Date('2026-12-01T10:00:00Z'),
      timeTo: new Date('2026-12-01T10:30:00Z'),
      doctor: {
        id: 5,
        profile: { name: 'Dr', lastName: 'House' },
        clinic: { name: 'C', timezone: 'America/Lima' },
      },
      specialty: { id: 3, name: 'Medicina' },
    },
  });

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn().mockResolvedValue(buildAppointment()),
      update: jest.fn().mockResolvedValue(buildAppointment()),
    };
    specialtyRepository = { findById: jest.fn().mockResolvedValue(null) };
    transactionRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByGatewayId: jest.fn(),
      findByPreferenceId: jest.fn(),
      findLatestByAppointmentId: jest.fn(),
      findByAppointmentId: jest.fn(),
    };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('America/Lima'),
    };
    eventEmitter = { emit: jest.fn() };

    useCase = new CancelAppointmentUseCase(
      appointmentRepository as any,
      specialtyRepository as any,
      transactionRepository,
      timezoneResolver as any,
      eventEmitter as any,
    );
  });

  it('flags the transaction as refund-pending when it was PAID', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(50, { reason: 'Cambio de planes' }, 'ADMIN');

    expect(transactionRepository.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        metadata: expect.objectContaining({
          needsRefund: true,
          refundCancelReason: 'Cambio de planes',
          refundCancelledBy: 'ADMIN',
        }),
      }),
    );
  });

  it('preserves existing transaction metadata when flagging refund', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: { mpPaymentId: 'abc', original: 'data' },
    } as any);

    await useCase.execute(50, { reason: 'Otro motivo' }, 'ADMIN');

    const updateCall = transactionRepository.update.mock.calls[0];
    expect(updateCall[1].metadata).toMatchObject({
      mpPaymentId: 'abc',
      original: 'data',
      needsRefund: true,
    });
  });

  it('does not touch transactions that are not PAID', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PENDING',
      metadata: null,
    } as any);

    await useCase.execute(50, { reason: 'x' }, 'ADMIN');

    expect(transactionRepository.update).not.toHaveBeenCalled();
  });

  it('is a no-op when the appointment has no transactions', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue(null);

    await useCase.execute(50, { reason: 'x' }, 'ADMIN');

    expect(transactionRepository.update).not.toHaveBeenCalled();
  });
});
