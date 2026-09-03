import { GetDashboardAppointmentsUseCase } from './get-dashboard-appointments.use-case.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';

describe('GetDashboardAppointmentsUseCase', () => {
  let useCase: GetDashboardAppointmentsUseCase;
  let appointmentRepository: jest.Mocked<
    Pick<IAppointmentRepository, 'findAllPaginated'>
  >;
  let doctorRepository: jest.Mocked<
    Pick<IDoctorRepository, 'findDoctorIdByUserId'>
  >;

  beforeEach(() => {
    appointmentRepository = {
      findAllPaginated: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<IAppointmentRepository, 'findAllPaginated'>
    >;

    doctorRepository = {
      findDoctorIdByUserId: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<IDoctorRepository, 'findDoctorIdByUserId'>
    >;

    useCase = new GetDashboardAppointmentsUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      doctorRepository as unknown as IDoctorRepository,
    );
  });

  it('RED->GREEN: aplica filtro isAtRisk y mapea confirmedAt e isAtRisk en la respuesta', async () => {
    const pagination = new PaginationImproved(undefined, 1, 10);
    const filterDto = { isAtRisk: true, status: AppointmentStatus.CONFIRMED };

    const confirmedDate = new Date('2026-10-10T12:00:00.000Z');
    appointmentRepository.findAllPaginated.mockResolvedValue({
      totalRows: 1,
      totalPages: 1,
      currentPage: 1,
      rows: [
        {
          id: 5,
          patientId: 10,
          scheduleId: 20,
          startTime: new Date('2026-10-11T09:00:00.000Z'),
          endTime: new Date('2026-10-11T09:30:00.000Z'),
          reason: 'Consulta general',
          notes: null,
          status: AppointmentStatus.CONFIRMED,
          paymentStatus: 'PAID',
          amount: 150,
          cancelReason: null,
          cancellationFee: null,
          isOverbook: false,
          pendingUntil: null,
          confirmedAt: confirmedDate,
          isAtRisk: true,
          clinicId: 1,
          deleted: false,
          createdAt: new Date(),
          updatedAt: null,
          hasPrescription: false,
          notesCount: 0,
          patient: {
            id: 10,
            profile: {
              name: 'Juan',
              lastName: 'Pérez',
              email: 'juan@test.com',
              userId: 100,
            },
          },
          schedule: {
            id: 20,
            scheduleDate: new Date('2026-10-11T00:00:00.000Z'),
            timeFrom: new Date('1970-01-01T08:00:00.000Z'),
            timeTo: new Date('1970-01-01T14:00:00.000Z'),
            doctor: {
              id: 3,
              profile: { name: 'Dr. Gregory', lastName: 'House' },
              clinic: {
                id: 1,
                name: 'Clínica Central',
                timezone: 'America/Lima',
              },
            },
            specialty: { id: 2, name: 'Medicina Interna' },
          },
        },
      ],
    });

    const result = await useCase.execute(pagination, filterDto);

    expect(appointmentRepository.findAllPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 }),
      expect.objectContaining({
        isAtRisk: true,
        status: AppointmentStatus.CONFIRMED,
      }),
    );

    expect(result.totalRows).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe(5);
    expect(result.rows[0].isAtRisk).toBe(true);
    expect(result.rows[0].confirmedAt).toEqual(confirmedDate);
  });
});
