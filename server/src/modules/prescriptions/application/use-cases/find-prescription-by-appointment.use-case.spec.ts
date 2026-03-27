import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FindPrescriptionByAppointmentUseCase } from './find-prescription-by-appointment.use-case.js';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';

describe('FindPrescriptionByAppointmentUseCase', () => {
  let useCase: FindPrescriptionByAppointmentUseCase;
  let prescriptionRepository: jest.Mocked<IPrescriptionRepository>;
  let appointmentRepository: jest.Mocked<Pick<IAppointmentRepository, 'findById'>>;
  let doctorRepository: jest.Mocked<Pick<IDoctorRepository, 'findDoctorIdByUserId'>>;

  const mockPrescription = {
    id: 1,
    appointmentId: 10,
    instructions: 'Tomar con agua',
    validUntil: new Date('2026-06-01'),
    createdAt: new Date(),
    items: [
      {
        id: 1,
        medication: 'Losartán',
        dosage: '50mg',
        frequency: '1 vez al día',
        duration: '3 meses',
        notes: 'En ayunas',
      },
    ],
    appointment: {
      status: 'COMPLETED',
      patient: {
        id: 1,
        profile: { name: 'Juan', lastName: 'Pérez' },
      },
      schedule: {
        scheduleDate: new Date('2026-03-22'),
        doctor: {
          id: 1,
          profile: { name: 'Roberto', lastName: 'Ramírez' },
        },
        specialty: { name: 'Cardiología General' },
      },
    },
  } as any;

  beforeEach(() => {
    prescriptionRepository = {
      createWithAutoComplete: jest.fn(),
      findByAppointmentId: jest.fn(),
      findByAppointmentIdForPdf: jest.fn(),
      findAppointmentDoctorId: jest.fn(),
    };

    appointmentRepository = {
      findById: jest.fn(),
    };

    doctorRepository = {
      findDoctorIdByUserId: jest.fn(),
    };

    useCase = new FindPrescriptionByAppointmentUseCase(
      prescriptionRepository,
      appointmentRepository as any,
      doctorRepository as any,
    );
  });

  it('should return prescription data for a valid appointment', async () => {
    prescriptionRepository.findByAppointmentId.mockResolvedValue(
      mockPrescription,
    );

    const result = await useCase.execute(1, 10);

    expect(result.id).toBe(1);
    expect(result.appointmentId).toBe(10);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].medication).toBe('Losartán');
    expect(result.patient.name).toBe('Juan');
    expect(result.doctor.name).toBe('Roberto');
    expect(result.specialtyName).toBe('Cardiología General');
  });

  it('should throw NotFoundException if no prescription exists', async () => {
    prescriptionRepository.findByAppointmentId.mockResolvedValue(null);

    await expect(useCase.execute(1, 999)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when doctor accesses another doctors prescription', async () => {
    const appointment = {
      schedule: { doctor: { id: 99 } },
    } as any;

    appointmentRepository.findById.mockResolvedValue(appointment);
    doctorRepository.findDoctorIdByUserId.mockResolvedValue(1);

    await expect(useCase.execute(1, 10, 'DOCTOR')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow admin to access any prescription', async () => {
    prescriptionRepository.findByAppointmentId.mockResolvedValue(
      mockPrescription,
    );

    const result = await useCase.execute(1, 10, 'ADMIN');

    expect(result.id).toBe(1);
    expect(appointmentRepository.findById).not.toHaveBeenCalled();
  });
});
