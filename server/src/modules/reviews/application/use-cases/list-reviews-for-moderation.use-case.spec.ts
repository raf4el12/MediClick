import { ForbiddenException } from '@nestjs/common';
import { ListReviewsForModerationUseCase } from './list-reviews-for-moderation.use-case.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { ReviewWithRelations } from '../../domain/interfaces/review-data.interface.js';

const review: ReviewWithRelations = {
  id: 5,
  appointmentId: 50,
  doctorId: 3,
  patientId: 10,
  rating: 2,
  comment: 'Demoró mucho',
  isVisible: false,
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  patient: { id: 10, profile: { name: 'Ana', lastName: 'Paciente' } },
  doctor: { id: 3, profile: { name: 'Gregorio', lastName: 'Médico' } },
};

describe('ListReviewsForModerationUseCase', () => {
  let repository: jest.Mocked<Pick<IReviewRepository, 'findForModeration'>>;
  let useCase: ListReviewsForModerationUseCase;

  beforeEach(() => {
    repository = {
      findForModeration: jest.fn().mockResolvedValue({
        totalRows: 1,
        totalPages: 1,
        currentPage: 1,
        rows: [review],
      }),
    } as unknown as jest.Mocked<Pick<IReviewRepository, 'findForModeration'>>;
    useCase = new ListReviewsForModerationUseCase(
      repository as unknown as IReviewRepository,
    );
  });

  it('un administrador de sede lista solo su sede, con los filtros pedidos', async () => {
    const result = await useCase.execute(
      {
        isVisible: false,
        rating: 2,
        doctorId: 3,
        currentPage: 2,
        pageSize: 20,
      },
      { roleName: 'ADMIN', clinicId: 1 },
    );

    expect(repository.findForModeration).toHaveBeenCalledWith(
      { clinicId: 1, isVisible: false, rating: 2, doctorId: 3 },
      { offset: 20, limit: 20 },
    );
    expect(result.rows[0]).toMatchObject({
      id: 5,
      isVisible: false,
      doctor: { id: 3, name: 'Gregorio', lastName: 'Médico' },
    });
  });

  it('un actor global lista todas las sedes con la paginación por defecto', async () => {
    await useCase.execute({}, { roleName: 'SUPER_ADMIN', clinicId: null });

    expect(repository.findForModeration).toHaveBeenCalledWith(
      { clinicId: null },
      { offset: 0, limit: 10 },
    );
  });

  it('un actor sin sede que no es global no lista nada', async () => {
    await expect(
      useCase.execute({}, { roleName: 'PATIENT', clinicId: null }),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.findForModeration).not.toHaveBeenCalled();
  });
});
