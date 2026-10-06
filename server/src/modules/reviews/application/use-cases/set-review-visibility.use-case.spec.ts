import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetReviewVisibilityUseCase } from './set-review-visibility.use-case.js';
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

describe('SetReviewVisibilityUseCase', () => {
  let repository: jest.Mocked<Pick<IReviewRepository, 'setVisibility'>>;
  let useCase: SetReviewVisibilityUseCase;

  beforeEach(() => {
    repository = {
      setVisibility: jest.fn().mockResolvedValue(review),
    } as unknown as jest.Mocked<Pick<IReviewRepository, 'setVisibility'>>;
    useCase = new SetReviewVisibilityUseCase(
      repository as unknown as IReviewRepository,
    );
  });

  it('un administrador de sede modera solo dentro de su sede', async () => {
    await useCase.execute(5, false, { roleName: 'ADMIN', clinicId: 1 });

    expect(repository.setVisibility).toHaveBeenCalledWith(5, false, 1);
  });

  it('un actor global modera sin alcance de sede', async () => {
    await useCase.execute(5, false, {
      roleName: 'SUPER_ADMIN',
      clinicId: null,
    });

    expect(repository.setVisibility).toHaveBeenCalledWith(5, false, null);
  });

  it('SUPER_ADMIN es global aunque tenga una sede asignada', async () => {
    await useCase.execute(5, true, { roleName: 'SUPER_ADMIN', clinicId: 2 });

    expect(repository.setVisibility).toHaveBeenCalledWith(5, true, null);
  });

  it('una reseña inexistente o de otra sede responde 404', async () => {
    repository.setVisibility.mockResolvedValue(null);

    await expect(
      useCase.execute(5, false, { roleName: 'ADMIN', clinicId: 1 }),
    ).rejects.toThrow(NotFoundException);
  });
  it('un actor sin sede que no es global no modera nada', async () => {
    await expect(
      useCase.execute(5, false, { roleName: 'PATIENT', clinicId: null }),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.setVisibility).not.toHaveBeenCalled();
  });
});
