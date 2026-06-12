import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarkNoShowAppointmentUseCase } from './mark-no-show-appointment.use-case.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';

describe('MarkNoShowAppointmentUseCase', () => {
  let useCase: MarkNoShowAppointmentUseCase;
  let appointmentRepository: { findById: jest.Mock; update: jest.Mock };
  let timezoneResolver: { resolveByDoctorId: jest.Mock };

  const PAST_DATE = new Date('2020-01-01T00:00:00.000Z');
  const FUTURE_DATE = new Date('2099-01-01T00:00:00.000Z');

  const buildAppointment = (
    overrides: Partial<AppointmentWithRelations> = {},
  ): AppointmentWithRelations => ({
    id: 10,
    patientId: 1,
    scheduleId: 5,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T09:30:00.000Z'),
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: 'PAID',
    amount: 120,
    reason: 'Control',
    notes: null,
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
      id: 1,
      profile: { name: 'Ana', lastName: 'Gómez', email: 'ana@x.com', userId: 1 },
    },
    schedule: {
      id: 5,
      scheduleDate: PAST_DATE,
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
      findById: jest.fn().mockResolvedValue(buildAppointment()),
      update: jest.fn().mockImplementation((id: number) =>
        Promise.resolve(
          buildAppointment({ id, status: AppointmentStatus.NO_SHOW }),
        ),
      ),
    };
    timezoneResolver = {
      resolveByDoctorId: jest.fn().mockResolvedValue('America/Lima'),
    };

    useCase = new MarkNoShowAppointmentUseCase(
      appointmentRepository as any,
      timezoneResolver as any,
    );
  });

  it('marca NO_SHOW una cita CONFIRMED cuya hora de inicio ya pasó', async () => {
    const result = await useCase.execute(10);

    expect(result.status).toBe(AppointmentStatus.NO_SHOW);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ status: AppointmentStatus.NO_SHOW }),
    );
  });

  it('lanza NotFoundException si la cita no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
  });

  it.each([
    AppointmentStatus.PENDING,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ])('solo se permite desde CONFIRMED (rechaza %s)', async (status) => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status }),
    );

    await expect(useCase.execute(10)).rejects.toThrow(BadRequestException);
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it('no permite marcar inasistencia antes de la hora de inicio de la cita', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({
        schedule: {
          ...buildAppointment().schedule,
          scheduleDate: FUTURE_DATE,
        },
      }),
    );

    await expect(useCase.execute(10)).rejects.toThrow(
      'antes de la hora de inicio',
    );
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });
});
