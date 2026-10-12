import { ForbiddenException } from '@nestjs/common';
import { GetReviewStatsUseCase } from './get-review-stats.use-case.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { ReviewStats } from '../../domain/interfaces/review-data.interface.js';

const stats: ReviewStats = {
  total: 7,
  visible: 5,
  averageRating: 4.3333,
  distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 3 },
};

describe('GetReviewStatsUseCase', () => {
  let repository: jest.Mocked<Pick<IReviewRepository, 'stats'>>;
  let useCase: GetReviewStatsUseCase;

  beforeEach(() => {
    repository = { stats: jest.fn().mockResolvedValue(stats) };
    useCase = new GetReviewStatsUseCase(
      repository as unknown as IReviewRepository,
    );
  });

  it('un administrador de sede cuenta solo su sede y redondea el promedio a un decimal', async () => {
    const result = await useCase.execute(
      { doctorId: 3 },
      { roleName: 'ADMIN', clinicId: 1 },
    );

    expect(repository.stats).toHaveBeenCalledWith({ clinicId: 1, doctorId: 3 });
    expect(result).toEqual({
      total: 7,
      visible: 5,
      hidden: 2,
      averageRating: 4.3,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 3 },
    });
  });

  it('un actor global cuenta todas las sedes', async () => {
    await useCase.execute({}, { roleName: 'SUPER_ADMIN', clinicId: null });
    expect(repository.stats).toHaveBeenCalledWith({ clinicId: null });

    await useCase.execute({}, { roleName: 'ADMIN', clinicId: null });
    expect(repository.stats).toHaveBeenLastCalledWith({ clinicId: null });
  });

  it('sin reseñas visibles el promedio es null', async () => {
    repository.stats.mockResolvedValue({
      total: 1,
      visible: 0,
      averageRating: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });

    const result = await useCase.execute(
      {},
      { roleName: 'ADMIN', clinicId: 2 },
    );

    expect(result).toMatchObject({ hidden: 1, averageRating: null });
  });

  it('un actor sin sede que no es global no ve agregados', async () => {
    await expect(
      useCase.execute({}, { roleName: 'RECEPTIONIST', clinicId: null }),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.stats).not.toHaveBeenCalled();
  });
});
