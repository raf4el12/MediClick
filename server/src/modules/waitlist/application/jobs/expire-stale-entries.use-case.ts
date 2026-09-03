import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';
import { logicalWindowId } from '../../../../shared/redis/job-window.js';

/**
 * Cada 15 min marca como EXPIRED las entradas cuya ventana de búsqueda
 * (waitUntil) ya pasó, para que dejen de competir en el matcher.
 * SDD-020: protegido por lease distribuido en Redis.
 */
@Injectable()
export class ExpireStaleEntriesUseCase {
  private readonly logger = new Logger(ExpireStaleEntriesUseCase.name);

  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
    private readonly jobLeaseService: JobLeaseService,
  ) {}

  @Cron('0 */15 * * * *')
  async execute(): Promise<void> {
    const now = new Date();
    await this.jobLeaseService.withLease(
      'waitlist-expire-stale-entries',
      logicalWindowId(now, 15 * 60_000),
      905,
      async () => {
        const count = await this.entryRepository.expireStale(now);
        if (count > 0) {
          this.logger.log(
            `[WAITLIST] ${count} entradas de lista de espera expiradas`,
          );
        }
      },
    );
  }
}
