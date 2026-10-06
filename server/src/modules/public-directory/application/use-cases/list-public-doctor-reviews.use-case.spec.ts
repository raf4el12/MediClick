import { NotFoundException } from '@nestjs/common';
import { ListPublicDoctorReviewsUseCase } from './list-public-doctor-reviews.use-case.js';
import type {
  IPublicDirectoryRepository,
  PublicDoctorRecord,
  PublicReviewRecord,
} from '../../domain/repositories/public-directory.repository.js';

const doctorRecord: PublicDoctorRecord = {
  id: 3,
  name: 'Gregorio',
  lastName: 'Médico',
  photo: null,
  resume: null,
  licenseNumber: 'CMP-12345',
  ratingAvg: 4.5,
  ratingCount: 2,
  specialties: [],
  clinic: { id: 7, name: 'Sede Central', address: null },
};

// La reseña trae datos del paciente y de la cita que nunca deben salir.
const reviewRecord = {
  id: 10,
  rating: 5,
  comment: 'Excelente atención',
  createdAt: new Date('2026-09-20T15:00:00.000Z'),
  patientId: 42,
  appointmentId: 900,
  patient: { name: 'Ana', lastName: 'Paciente' },
} as PublicReviewRecord;

describe('ListPublicDoctorReviewsUseCase', () => {
  let repository: jest.Mocked<
    Pick<IPublicDirectoryRepository, 'findDoctor' | 'listVisibleReviews'>
  >;
  let useCase: ListPublicDoctorReviewsUseCase;

  beforeEach(() => {
    repository = {
      findDoctor: jest.fn().mockResolvedValue(doctorRecord),
      listVisibleReviews: jest
        .fn()
        .mockResolvedValue({ rows: [reviewRecord], totalRows: 1 }),
    } as unknown as jest.Mocked<
      Pick<IPublicDirectoryRepository, 'findDoctor' | 'listVisibleReviews'>
    >;
    useCase = new ListPublicDoctorReviewsUseCase(
      repository as unknown as IPublicDirectoryRepository,
    );
  });

  it('devuelve reseñas visibles sin datos del paciente ni de la cita, con el rating del médico', async () => {
    const result = await useCase.execute(3, { currentPage: 2, pageSize: 5 });

    expect(repository.listVisibleReviews).toHaveBeenCalledWith(3, {
      offset: 5,
      limit: 5,
    });
    expect(result).toEqual({
      rows: [
        {
          id: 10,
          rating: 5,
          comment: 'Excelente atención',
          createdAt: new Date('2026-09-20T15:00:00.000Z'),
        },
      ],
      totalRows: 1,
      ratingAvg: 4.5,
      ratingCount: 2,
    });
  });

  it('las reseñas de un médico que no es público responden 404', async () => {
    repository.findDoctor.mockResolvedValue(null);

    await expect(useCase.execute(3, {})).rejects.toThrow(NotFoundException);
    expect(repository.listVisibleReviews).not.toHaveBeenCalled();
  });
});
