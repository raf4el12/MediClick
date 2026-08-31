import { ExpireStaleOffersUseCase } from './expire-stale-offers.use-case.js';

function buildExpiredOffer(overrides: any = {}) {
  return {
    id: 777,
    scheduleId: 100,
    startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)),
    endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
    clinicId: 1,
    status: 'EXPIRED',
    ...overrides,
  };
}

describe('ExpireStaleOffersUseCase', () => {
  let useCase: ExpireStaleOffersUseCase;
  let offerRepo: any;
  let lock: any;
  let findNextMatch: any;

  beforeEach(() => {
    offerRepo = { expireStaleReturning: jest.fn() };
    lock = { release: jest.fn() };
    findNextMatch = { execute: jest.fn() };
    useCase = new ExpireStaleOffersUseCase(offerRepo, lock, findNextMatch);
  });

  it('no hace nada si no hay ofertas vencidas', async () => {
    offerRepo.expireStaleReturning.mockResolvedValue([]);

    await useCase.execute();

    expect(lock.release).not.toHaveBeenCalled();
    expect(findNextMatch.execute).not.toHaveBeenCalled();
  });

  it('caso permitido: libera el lock con el token = offerId (SDD-014) y reofrece el slot', async () => {
    const offer = buildExpiredOffer();
    offerRepo.expireStaleReturning.mockResolvedValue([offer]);

    await useCase.execute();

    expect(lock.release).toHaveBeenCalledWith(
      offer.scheduleId,
      offer.startTime,
      String(offer.id),
    );
    expect(findNextMatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: offer.scheduleId,
        startTime: offer.startTime,
        endTime: offer.endTime,
        clinicId: offer.clinicId,
      }),
    );
  });

  it('frontera: cada oferta vencida usa su propio offerId como token, nunca el de otra oferta', async () => {
    const offerA = buildExpiredOffer({ id: 111, scheduleId: 100 });
    const offerB = buildExpiredOffer({ id: 222, scheduleId: 200 });
    offerRepo.expireStaleReturning.mockResolvedValue([offerA, offerB]);

    await useCase.execute();

    expect(lock.release).toHaveBeenNthCalledWith(
      1,
      offerA.scheduleId,
      offerA.startTime,
      String(offerA.id),
    );
    expect(lock.release).toHaveBeenNthCalledWith(
      2,
      offerB.scheduleId,
      offerB.startTime,
      String(offerB.id),
    );
  });
});
