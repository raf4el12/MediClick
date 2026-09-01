import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { ConfirmAppointmentUseCase } from './confirm-appointment.use-case.js';

describe('ConfirmAppointmentUseCase', () => {
  const buildAppointment = (
    userId: number | null,
    status = AppointmentStatus.PENDING,
  ): AppointmentWithRelations => ({
    id: 50,
    patientId: 5,
    scheduleId: 20,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T09:30:00.000Z'),
    reason: null,
    notes: null,
    status,
    paymentStatus: 'PENDING',
    amount: 100,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    clinicId: 7,
    deleted: false,
    createdAt: new Date('2026-08-31T00:00:00.000Z'),
    updatedAt: null,
    hasPrescription: false,
    notesCount: 0,
    patient: {
      id: 5,
      profile: {
        name: 'Ana',
        lastName: 'Gómez',
        email: userId === null ? '' : 'ana@example.test',
        userId,
      },
    },
    schedule: {
      id: 20,
      scheduleDate: new Date('2030-01-01T00:00:00.000Z'),
      timeFrom: new Date('1970-01-01T08:00:00.000Z'),
      timeTo: new Date('1970-01-01T12:00:00.000Z'),
      doctor: {
        id: 3,
        profile: { name: 'Gregory', lastName: 'House', userId: 30 },
        clinic: {
          id: 7,
          name: 'Clínica',
          timezone: 'America/Lima',
        },
      },
      specialty: { id: 2, name: 'Medicina' },
    },
  });

  const actor = {
    id: 1,
    email: 'admin@example.test',
    roleId: 1,
    roleName: SystemRole.SUPER_ADMIN,
    clinicId: null,
  };

  it('delega estado y evento durable a una única operación atómica', async () => {
    const pending = buildAppointment(42);
    const confirmed = buildAppointment(42, AppointmentStatus.CONFIRMED);
    const repository: jest.Mocked<
      Pick<IAppointmentRepository, 'findById' | 'confirmAtomically'>
    > = {
      findById: jest.fn().mockResolvedValue(pending),
      confirmAtomically: jest.fn().mockResolvedValue(confirmed),
    };
    const eventEmitter = { emit: jest.fn() };
    const useCase = new ConfirmAppointmentUseCase(
      repository as unknown as IAppointmentRepository,
      eventEmitter as unknown as EventEmitter2,
      new AppointmentAccessPolicy(),
    );

    await useCase.execute(50, actor);

    const [appointmentId, identity] =
      repository.confirmAtomically.mock.calls[0];
    expect(appointmentId).toBe(50);
    expect(typeof identity.operationId).toBe('string');
    expect(typeof identity.eventId).toBe('string');
    expect(identity.occurredAt).toBeInstanceOf(Date);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'appointment.confirmed',
      expect.objectContaining({ appointmentId: 50 }),
    );
  });

  it('persiste la confirmación durable aunque el paciente no tenga usuario para correo', async () => {
    const pending = buildAppointment(null);
    const confirmed = buildAppointment(null, AppointmentStatus.CONFIRMED);
    const repository: jest.Mocked<
      Pick<IAppointmentRepository, 'findById' | 'confirmAtomically'>
    > = {
      findById: jest.fn().mockResolvedValue(pending),
      confirmAtomically: jest.fn().mockResolvedValue(confirmed),
    };
    const eventEmitter = { emit: jest.fn() };
    const useCase = new ConfirmAppointmentUseCase(
      repository as unknown as IAppointmentRepository,
      eventEmitter as unknown as EventEmitter2,
      new AppointmentAccessPolicy(),
    );

    await useCase.execute(50, actor);

    expect(repository.confirmAtomically.mock.calls).toHaveLength(1);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
