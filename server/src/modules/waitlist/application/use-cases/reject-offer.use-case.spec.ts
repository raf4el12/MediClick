import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RejectOfferUseCase } from './reject-offer.use-case.js';

function buildOffer(overrides: any = {}) {
  return {
    id: 777,
    scheduleId: 100,
    startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)),
    endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
    clinicId: 1,
    status: 'PENDING',
    entry: { patientId: 42 },
    ...overrides,
  };
}

describe('RejectOfferUseCase', () => {
  let useCase: RejectOfferUseCase;
  let offerRepo: any;
  let patientRepo: any;
  let lock: any;
  let findNextMatch: any;

  beforeEach(() => {
    offerRepo = { findById: jest.fn(), markRejected: jest.fn() };
    patientRepo = { findByUserId: jest.fn() };
    lock = { release: jest.fn() };
    findNextMatch = { execute: jest.fn() };
    useCase = new RejectOfferUseCase(
      offerRepo,
      patientRepo,
      lock,
      findNextMatch,
    );
  });

  it('lanza NotFound si la oferta no existe', async () => {
    offerRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(900, 777)).rejects.toThrow(NotFoundException);
  });

  it('lanza Forbidden si la oferta no pertenece al paciente', async () => {
    offerRepo.findById.mockResolvedValue(buildOffer());
    patientRepo.findByUserId.mockResolvedValue({ id: 99 });
    await expect(useCase.execute(900, 777)).rejects.toThrow(ForbiddenException);
  });

  it('lanza BadRequest si la oferta ya no está pendiente', async () => {
    offerRepo.findById.mockResolvedValue(buildOffer());
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.markRejected.mockResolvedValue(null);
    await expect(useCase.execute(900, 777)).rejects.toThrow(BadRequestException);
  });

  it('al rechazar libera el lock y reofrece el slot al siguiente en cola', async () => {
    const offer = buildOffer();
    offerRepo.findById.mockResolvedValue(offer);
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.markRejected.mockResolvedValue(offer);

    await useCase.execute(900, 777);

    expect(lock.release).toHaveBeenCalledWith(offer.scheduleId, offer.startTime);
    expect(findNextMatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleId: 100, clinicId: 1 }),
    );
  });
});
