import { NotFoundException } from '@nestjs/common';
import { FindPrescriptionByAppointmentUseCase } from './find-prescription-by-appointment.use-case.js';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';

describe('FindPrescriptionByAppointmentUseCase', () => {
  let useCase: FindPrescriptionByAppointmentUseCase;
  let prescriptionRepository: jest.Mocked<IPrescriptionRepository>;

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

    useCase = new FindPrescriptionByAppointmentUseCase(prescriptionRepository);
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
});
