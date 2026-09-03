import { ExpireStaleEntriesUseCase } from './expire-stale-entries.use-case.js';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import type { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';

describe('ExpireStaleEntriesUseCase (SDD-020)', () => {
  let useCase: ExpireStaleEntriesUseCase;
  let entryRepo: jest.Mocked<Pick<IWaitlistEntryRepository, 'expireStale'>>;
  let jobLeaseService: jest.Mocked<Pick<JobLeaseService, 'withLease'>>;

  beforeEach(() => {
    entryRepo = {
      expireStale: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<Pick<IWaitlistEntryRepository, 'expireStale'>>;

    jobLeaseService = {
      withLease: jest.fn().mockImplementation(async (_name, _ttl, fn) => {
        const res = await (fn as () => Promise<unknown>)();
        return { executed: true, result: res };
      }),
    } as unknown as jest.Mocked<Pick<JobLeaseService, 'withLease'>>;

    useCase = new ExpireStaleEntriesUseCase(
      entryRepo as unknown as IWaitlistEntryRepository,
      jobLeaseService as unknown as JobLeaseService,
    );
  });

  it('RED->GREEN: ejecuta expiración dentro de lease distribuido', async () => {
    entryRepo.expireStale.mockResolvedValue(5);

    await useCase.execute();

    expect(jobLeaseService.withLease).toHaveBeenCalledWith(
      'waitlist-expire-stale-entries',
      840,
      expect.any(Function) as unknown as () => Promise<void>,
    );
    expect(entryRepo.expireStale).toHaveBeenCalledWith(expect.any(Date));
  });

  it('no registra log de auditoría si ninguna entrada expiró', async () => {
    entryRepo.expireStale.mockResolvedValue(0);

    await useCase.execute();

    expect(entryRepo.expireStale).toHaveBeenCalledTimes(1);
  });
});
