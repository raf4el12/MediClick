import { GetMyAppointmentsSummaryUseCase } from './get-my-appointments-summary.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { LIMA, appointment } from './testing/patient-appointment.builder.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { NotFoundException } from '@nestjs/common';

describe('GetMyAppointmentsSummaryUseCase', () => {
  let useCase: GetMyAppointmentsSummaryUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findPatientSummarySource'>
  >;
  let patientRepository: jest.Mocked<Pick<IPatientRepository, 'findByUserId'>>;

  const source = (
    appointments: AppointmentWithRelations[],
    counts = { completedCount: 0, pendingReviewCount: 0 },
  ) =>
    appointmentRepository.findPatientSummarySource.mockResolvedValue({
      appointments,
      ...counts,
    });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00.000Z'));
    appointmentRepository = { findPatientSummarySource: jest.fn() } as never;
    patientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 7 }),
    } as never;
    useCase = new GetMyAppointmentsSummaryUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      patientRepository as unknown as IPatientRepository,
    );
    source([]);
  });

  afterEach(() => jest.useRealTimers());

  it('sin citas no hay próxima cita y los contadores quedan en cero', async () => {
    await expect(useCase.execute(70)).resolves.toEqual({
      nextAppointment: null,
      upcomingCount: 0,
      awaitingPaymentCount: 0,
      earliestPaymentDeadline: null,
      completedCount: 0,
      pendingReviewCount: 0,
    });
  });

  it('la próxima cita es la de menor instante entre sedes, no la de menor hora local', async () => {
    source([
      appointment({ id: 1, start: '10:00', timezone: LIMA }), // 15:00 UTC
      appointment({
        id: 2,
        start: '11:00',
        timezone: 'America/Argentina/Buenos_Aires',
      }), // 14:00 UTC
    ]);

    const summary = await useCase.execute(70);

    expect(summary.nextAppointment?.id).toBe(2);
    expect(summary.upcomingCount).toBe(2);
  });

  it('una cita de hoy cuyo inicio ya pasó en la zona de su sede no es próxima', async () => {
    source([appointment({ id: 1, start: '06:30', timezone: LIMA })]); // 11:30 UTC < 12:00 UTC

    const summary = await useCase.execute(70);

    expect(summary.nextAppointment).toBeNull();
    expect(summary.upcomingCount).toBe(0);
  });

  it('solo las pendientes y confirmadas pueden ser próximas', async () => {
    source([
      appointment({
        id: 1,
        start: '15:00',
        status: AppointmentStatus.CANCELLED,
      }),
      appointment({ id: 2, start: '15:00', status: AppointmentStatus.NO_SHOW }),
      appointment({
        id: 3,
        start: '15:00',
        status: AppointmentStatus.COMPLETED,
      }),
      appointment({
        id: 4,
        start: '15:00',
        status: AppointmentStatus.IN_PROGRESS,
      }),
      appointment({
        id: 5,
        start: '16:00',
        status: AppointmentStatus.PENDING,
        paymentStatus: 'PENDING',
      }),
    ]);

    const summary = await useCase.execute(70);

    expect(summary.nextAppointment?.id).toBe(5);
    expect(summary.upcomingCount).toBe(1);
  });

  it('cuenta como pendientes de pago las que aceptaría Mercado Pago y expone el plazo más cercano', async () => {
    source([
      appointment({
        id: 1,
        start: '15:00',
        status: AppointmentStatus.PENDING,
        paymentStatus: 'PENDING',
        pendingUntil: new Date('2026-10-20T12:30:00.000Z'),
      }),
      appointment({
        id: 2,
        start: '16:00',
        status: AppointmentStatus.PENDING,
        paymentStatus: 'PENDING',
        pendingUntil: new Date('2026-10-20T12:10:00.000Z'),
      }),
      appointment({
        id: 3,
        start: '17:00',
        status: AppointmentStatus.PENDING,
        paymentStatus: 'PENDING',
        pendingUntil: new Date('2026-10-20T11:00:00.000Z'),
      }),
      appointment({
        id: 4,
        date: '2026-10-25',
        status: AppointmentStatus.CONFIRMED,
        paymentStatus: 'PARTIAL',
      }),
      appointment({
        id: 5,
        date: '2026-10-25',
        status: AppointmentStatus.CONFIRMED,
        paymentStatus: 'PAID',
      }),
    ]);

    const summary = await useCase.execute(70);

    expect(summary.awaitingPaymentCount).toBe(3);
    expect(summary.earliestPaymentDeadline).toEqual(
      new Date('2026-10-20T12:10:00.000Z'),
    );
  });

  it('expone los conteos de completadas y de completadas sin reseña', async () => {
    source([], { completedCount: 8, pendingReviewCount: 1 });

    await expect(useCase.execute(70)).resolves.toMatchObject({
      completedCount: 8,
      pendingReviewCount: 1,
    });
  });

  it('un usuario sin perfil de paciente recibe 404', async () => {
    patientRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(70)).rejects.toBeInstanceOf(NotFoundException);
    expect(
      appointmentRepository.findPatientSummarySource,
    ).not.toHaveBeenCalled();
  });

  it('consulta solo por el paciente, desde el día UTC anterior, sin filtrar por sede', async () => {
    await useCase.execute(70);

    expect(appointmentRepository.findPatientSummarySource).toHaveBeenCalledWith(
      7,
      new Date('2026-10-19T00:00:00.000Z'),
    );
  });
});
