import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewUseCase } from './create-review.use-case.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { AppointmentWithRelations } from '../../../appointments/domain/interfaces/appointment-data.interface.js';
import type { PatientWithRelations } from '../../../patients/domain/interfaces/patient-data.interface.js';
import type { ReviewWithRelations } from '../../domain/interfaces/review-data.interface.js';

describe('CreateReviewUseCase — TDD', () => {
  let useCase: CreateReviewUseCase;
  let reviewRepository: jest.Mocked<
    Pick<IReviewRepository, 'existsByAppointmentId' | 'create'>
  >;
  let appointmentRepository: jest.Mocked<Pick<IAppointmentRepository, 'findById'>>;
  let patientRepository: jest.Mocked<Pick<IPatientRepository, 'findByUserId'>>;

  const dto = { appointmentId: 100, rating: 5, comment: 'Excelente' };

  const buildAppointment = (
    overrides: Partial<AppointmentWithRelations> = {},
  ): AppointmentWithRelations => ({
    id: 100,
    patientId: 5,
    scheduleId: 20,
    startTime: new Date('2030-01-01T09:00:00.000Z'),
    endTime: new Date('2030-01-01T09:30:00.000Z'),
    reason: 'Control',
    notes: null,
    status: AppointmentStatus.COMPLETED,
    paymentStatus: 'PAID',
    amount: 120,
    cancelReason: null,
    cancellationFee: null,
    isOverbook: false,
    pendingUntil: null,
    clinicId: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
    hasPrescription: false,
    notesCount: 0,
    patient: {
      id: 5,
      profile: { name: 'Ana', lastName: 'Gómez', email: 'ana@x.com', userId: 42 },
    },
    schedule: {
      id: 20,
      scheduleDate: new Date('2030-01-01T00:00:00.000Z'),
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

  const buildPatient = (): PatientWithRelations => ({
    id: 5,
    profileId: 50,
    emergencyContact: '+51999000111',
    bloodType: 'O+',
    allergies: null,
    chronicConditions: null,
    isActive: true,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
    profile: {
      id: 50,
      name: 'Ana',
      lastName: 'Gómez',
      email: 'ana@x.com',
      phone: null,
      birthday: null,
      gender: null,
      typeDocument: null,
      numberDocument: null,
      userId: 42,
    },
  });

  const buildReview = (): ReviewWithRelations => ({
    id: 1,
    appointmentId: 100,
    doctorId: 3,
    patientId: 5,
    rating: 5,
    comment: 'Excelente',
    isVisible: true,
    createdAt: new Date(),
    patient: { id: 5, profile: { name: 'Ana', lastName: 'Gómez' } },
    doctor: { id: 3, profile: { name: 'Dr', lastName: 'House' } },
  });

  beforeEach(() => {
    reviewRepository = {
      existsByAppointmentId: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(buildReview()),
    };
    appointmentRepository = {
      findById: jest.fn().mockResolvedValue(buildAppointment()),
    };
    patientRepository = {
      findByUserId: jest.fn().mockResolvedValue(buildPatient()),
    };

    useCase = new CreateReviewUseCase(
      reviewRepository as any,
      appointmentRepository as any,
      patientRepository as any,
    );
  });

  it('crea la reseña de una cita COMPLETED propia y retorna la respuesta', async () => {
    const result = await useCase.execute(42, dto, 1);

    expect(result.rating).toBe(5);
    expect(result.doctorId).toBe(3);
    expect(reviewRepository.create).toHaveBeenCalledTimes(1);
  });

  it('deriva doctorId y clinicId del servidor, no del cliente', async () => {
    await useCase.execute(42, dto, 7);

    expect(reviewRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 3, patientId: 5, clinicId: 7 }),
    );
  });

  it('lanza NotFound si la cita no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(42, dto, 1)).rejects.toThrow(NotFoundException);
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });

  it('lanza BadRequest si el usuario no tiene paciente asociado', async () => {
    patientRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(42, dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('lanza Forbidden si la cita no pertenece al paciente', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ patientId: 999 }),
    );

    await expect(useCase.execute(42, dto, 1)).rejects.toThrow(ForbiddenException);
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });

  it('lanza BadRequest si la cita no está COMPLETED', async () => {
    appointmentRepository.findById.mockResolvedValue(
      buildAppointment({ status: AppointmentStatus.CONFIRMED }),
    );

    await expect(useCase.execute(42, dto, 1)).rejects.toThrow(BadRequestException);
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });

  it('lanza Conflict si la cita ya tiene reseña', async () => {
    reviewRepository.existsByAppointmentId.mockResolvedValue(true);

    await expect(useCase.execute(42, dto, 1)).rejects.toThrow(ConflictException);
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });
});
