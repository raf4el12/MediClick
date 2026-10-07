import { GetDoctorReviewsUseCase } from './get-doctor-reviews.use-case.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';

describe('GetDoctorReviewsUseCase', () => {
  let repository: jest.Mocked<Pick<IReviewRepository, 'findByDoctorId'>>;
  let useCase: GetDoctorReviewsUseCase;

  beforeEach(() => {
    repository = {
      findByDoctorId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Pick<IReviewRepository, 'findByDoctorId'>>;
    useCase = new GetDoctorReviewsUseCase(
      repository as unknown as IReviewRepository,
    );
  });

  it('la vista de moderación de un médico se acota a la sede del actor', async () => {
    await useCase.execute(3, { roleName: 'ADMIN', clinicId: 1 });

    expect(repository.findByDoctorId).toHaveBeenCalledWith(3, false, 1);
  });

  it('las reseñas visibles de un médico no dependen de la sede de quien consulta', async () => {
    await useCase.execute(3);

    expect(repository.findByDoctorId).toHaveBeenCalledWith(3, true, null);
  });
});
