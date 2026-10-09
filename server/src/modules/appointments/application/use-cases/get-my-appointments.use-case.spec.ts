import { GetMyAppointmentsUseCase } from './get-my-appointments.use-case.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { LIMA, appointment } from './testing/patient-appointment.builder.js';

describe('GetMyAppointmentsUseCase', () => {
  let useCase: GetMyAppointmentsUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<
      IAppointmentRepository,
      'findByPatientPaginated' | 'findPatientSummarySource'
    >
  >;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00.000Z'));
    appointmentRepository = {
      findByPatientPaginated: jest.fn().mockResolvedValue({
        totalRows: 1,
        rows: [appointment()],
        totalPages: 1,
        currentPage: 1,
      }),
      findPatientSummarySource: jest.fn().mockResolvedValue({
        appointments: [],
        completedCount: 0,
        pendingReviewCount: 0,
      }),
    } as never;
    useCase = new GetMyAppointmentsUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      {
        findByUserId: jest.fn().mockResolvedValue({ id: 7 }),
      } as unknown as IPatientRepository,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('cada cita trae su sede con nombre, dirección y moneda', async () => {
    const result = await useCase.execute(70, new PaginationImproved(), {});

    expect(result.rows[0]?.clinic).toEqual({
      id: 1,
      name: 'Sede Miraflores',
      address: 'Av. Larco 1150',
      currency: 'PEN',
    });
  });

  it('"Próximas" descarta las de hoy ya iniciadas en su sede y ordena por instante entre sedes', async () => {
    appointmentRepository.findPatientSummarySource.mockResolvedValue({
      appointments: [
        appointment({ id: 1, start: '06:30', timezone: LIMA }), // ya empezó (11:30 UTC)
        appointment({ id: 2, start: '10:00', timezone: LIMA }), // 15:00 UTC
        appointment({
          id: 3,
          start: '11:00',
          timezone: 'America/Argentina/Buenos_Aires',
        }), // 14:00 UTC
      ],
      completedCount: 0,
      pendingReviewCount: 0,
    });

    const result = await useCase.execute(
      70,
      new PaginationImproved(undefined, 1, 10),
      { upcoming: true },
    );

    expect(result.rows.map((r) => r.id)).toEqual([3, 2]);
    expect(result.totalRows).toBe(2);
    expect(appointmentRepository.findPatientSummarySource).toHaveBeenCalledWith(
      7,
      new Date('2026-10-19T00:00:00.000Z'),
    );
  });
});
