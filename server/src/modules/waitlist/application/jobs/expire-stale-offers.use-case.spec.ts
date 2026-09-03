import { ExpireStaleOffersUseCase } from './expire-stale-offers.use-case.js';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import type { WaitlistLockService } from '../services/waitlist-lock.service.js';
import type { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';
import type { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';
import type { WaitlistOfferWithEntry } from '../../domain/interfaces/waitlist-data.interface.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';

function buildExpiredOffer(
  overrides: Partial<WaitlistOfferWithEntry> = {},
): WaitlistOfferWithEntry {
  return {
    id: 777,
    waitlistEntryId: 1,
    scheduleId: 100,
    startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)),
    endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
    expiresAt: new Date(Date.UTC(2030, 0, 1, 9, 15)),
    clinicId: 1,
    status: WaitlistOfferStatus.EXPIRED,
    acceptedAt: null,
    rejectedAt: null,
    createdAppointmentId: null,
    createdAt: new Date(),
    entry: null as unknown as WaitlistOfferWithEntry['entry'],
    ...overrides,
  };
}

describe('ExpireStaleOffersUseCase', () => {
  let useCase: ExpireStaleOffersUseCase;
  let offerRepo: jest.Mocked<
    Pick<IWaitlistOfferRepository, 'expireStaleReturning'>
  >;
  let lock: jest.Mocked<Pick<WaitlistLockService, 'release'>>;
  let findNextMatch: jest.Mocked<Pick<FindNextMatchUseCase, 'execute'>>;
  let jobLeaseService: jest.Mocked<Pick<JobLeaseService, 'withLease'>>;

  beforeEach(() => {
    offerRepo = { expireStaleReturning: jest.fn() } as unknown as jest.Mocked<
      Pick<IWaitlistOfferRepository, 'expireStaleReturning'>
    >;
    lock = { release: jest.fn() } as unknown as jest.Mocked<
      Pick<WaitlistLockService, 'release'>
    >;
    findNextMatch = { execute: jest.fn() } as unknown as jest.Mocked<
      Pick<FindNextMatchUseCase, 'execute'>
    >;
    jobLeaseService = {
      withLease: jest.fn().mockImplementation(async (_name, _ttl, fn) => {
        const res = await (fn as () => Promise<unknown>)();
        return { executed: true, result: res };
      }),
    } as unknown as jest.Mocked<Pick<JobLeaseService, 'withLease'>>;

    useCase = new ExpireStaleOffersUseCase(
      offerRepo as unknown as IWaitlistOfferRepository,
      lock as unknown as WaitlistLockService,
      findNextMatch as unknown as FindNextMatchUseCase,
      jobLeaseService as unknown as JobLeaseService,
    );
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
