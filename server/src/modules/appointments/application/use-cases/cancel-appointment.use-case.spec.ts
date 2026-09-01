import { CancelAppointmentUseCase } from './cancel-appointment.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { AppointmentCancellationService } from '../services/appointment-cancellation.service.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

describe('CancelAppointmentUseCase — refund flagging', () => {
  let useCase: CancelAppointmentUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findById' | 'cancelAtomically'>
  >;
  let specialtyRepository: jest.Mocked<Pick<ISpecialtyRepository, 'findById'>>;
  let transactionRepository: jest.Mocked<ITransactionRepository>;
  let timezoneResolver: jest.Mocked<
    Pick<
      TimezoneResolverService,
      'resolveByDoctorId' | 'resolveClinicIdByDoctorId'
    >
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  const buildActor = (roleName: string): AuthenticatedUser => ({
    id: roleName === String(SystemRole.PATIENT) ? 42 : 900,
    email: 'actor@mediclick.test',
    roleId: 1,
    roleName,
    clinicId: null,
  });

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
      cancelAtomically: jest.fn().mockResolvedValue({
        appointment: buildAppointment(),
        refundReviewTransactionId: null,
        transitioned: true,
      }),
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
      findAll: jest.fn(),
    };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('America/Lima'),
      resolveClinicIdByDoctorId: jest.fn().mockResolvedValue(1),
    };
    eventEmitter = { emit: jest.fn() };

    useCase = new CancelAppointmentUseCase(
      appointmentRepository as any,
      specialtyRepository as any,
      transactionRepository,
      timezoneResolver as any,
      new AppointmentCancellationService(
        appointmentRepository as any,
        eventEmitter as any,
      ),
      new AppointmentAccessPolicy(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delega la revisión financiera PAID a la cancelación atómica', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(
      50,
      { reason: 'Cambio de planes' },
      buildActor(SystemRole.ADMIN),
    );

    expect(appointmentRepository.cancelAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Cambio de planes',
        cancelledBy: 'ADMIN',
      }),
    );
  });

  it('no muta metadata financiera fuera de la transacción atómica', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: { mpPaymentId: 'abc', original: 'data' },
    } as any);

    await useCase.execute(
      50,
      { reason: 'Otro motivo' },
      buildActor(SystemRole.ADMIN),
    );

    expect(transactionRepository.update.mock.calls).toHaveLength(0);
    expect(appointmentRepository.cancelAtomically).toHaveBeenCalledTimes(1);
  });

  it('does not touch transactions that are not PAID', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PENDING',
      metadata: null,
    } as any);

    await useCase.execute(50, { reason: 'x' }, buildActor(SystemRole.ADMIN));

    expect(transactionRepository.update.mock.calls).toHaveLength(0);
    expect(appointmentRepository.cancelAtomically).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the appointment has no transactions', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue(null);

    await useCase.execute(50, { reason: 'x' }, buildActor(SystemRole.ADMIN));

    expect(transactionRepository.update.mock.calls).toHaveLength(0);
    expect(appointmentRepository.cancelAtomically).toHaveBeenCalledTimes(1);
  });

  it('paciente cancela tarde con pago PAID: persiste el fee y marca needsFeeCollection', async () => {
    // 2026-12-01T14:00Z = 09:00 Lima → ~1h antes de la cita (10:00)
    jest.useFakeTimers({ now: new Date('2026-12-01T14:00:00Z') });
    specialtyRepository.findById.mockResolvedValue({
      id: 3,
      price: 120,
    } as any);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(
      50,
      { reason: 'No puedo asistir' },
      buildActor(SystemRole.PATIENT),
    );

    // fee = 50% de 120 = 60, delegado a la frontera atómica.
    expect(appointmentRepository.cancelAtomically).toHaveBeenCalledWith(
      expect.objectContaining({ cancellationFee: 60 }),
    );
    expect(transactionRepository.update.mock.calls).toHaveLength(0);
  });

  it('paciente cancela tarde SIN pago PAID: no calcula fee ni toca la transacción', async () => {
    jest.useFakeTimers({ now: new Date('2026-12-01T14:00:00Z') });
    specialtyRepository.findById.mockResolvedValue({
      id: 3,
      price: 120,
    } as any);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PENDING',
      metadata: null,
    } as any);

    await useCase.execute(
      50,
      { reason: 'No puedo asistir' },
      buildActor(SystemRole.PATIENT),
    );

    const cancelArg = appointmentRepository.cancelAtomically.mock.calls[0][0];
    expect(cancelArg.cancellationFee).toBeUndefined();
    expect(transactionRepository.update.mock.calls).toHaveLength(0);
  });

  it('paciente cancela temprano (>24h) con pago PAID: sin fee, refund intacto', async () => {
    // 2026-11-20 → ~11 días antes de la cita
    jest.useFakeTimers({ now: new Date('2026-11-20T14:00:00Z') });
    specialtyRepository.findById.mockResolvedValue({
      id: 3,
      price: 120,
    } as any);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(
      50,
      { reason: 'Cambio de planes' },
      buildActor(SystemRole.PATIENT),
    );

    const cancelArg = appointmentRepository.cancelAtomically.mock.calls[0][0];
    expect(cancelArg.cancellationFee).toBeUndefined();
    expect(transactionRepository.update.mock.calls).toHaveLength(0);
  });

  it('staff cancela con pago PAID: solo refund, sin fee', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(
      50,
      { reason: 'Reprogramación interna' },
      buildActor(SystemRole.ADMIN),
    );

    const cancelArg = appointmentRepository.cancelAtomically.mock.calls[0][0];
    expect(cancelArg.cancellationFee).toBeUndefined();
    expect(transactionRepository.update.mock.calls).toHaveLength(0);
  });
});
