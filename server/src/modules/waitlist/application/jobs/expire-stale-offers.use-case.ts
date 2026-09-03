import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import { WaitlistLockService } from '../services/waitlist-lock.service.js';
import { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';
import { JobLeaseService } from '../../../../shared/redis/job-lease.service.js';
import { logicalWindowId } from '../../../../shared/redis/job-window.js';

/**
 * Cada 30s expira las ofertas vencidas (paciente no respondió) y reofrece cada
 * slot al siguiente en cola. El lock se libera antes de reofrecer.
 * SDD-020: protegido por lease distribuido en Redis.
 */
@Injectable()
export class ExpireStaleOffersUseCase {
  private readonly logger = new Logger(ExpireStaleOffersUseCase.name);

  constructor(
    @Inject('IWaitlistOfferRepository')
    private readonly offerRepository: IWaitlistOfferRepository,
    private readonly lock: WaitlistLockService,
    private readonly findNextMatch: FindNextMatchUseCase,
    private readonly jobLeaseService: JobLeaseService,
  ) {}

  @Cron('*/30 * * * * *')
  async execute(): Promise<void> {
    const now = new Date();
    await this.jobLeaseService.withLease(
      'waitlist-expire-stale-offers',
      logicalWindowId(now, 30_000),
      35,
      async () => {
        const expired = await this.offerRepository.expireStaleReturning(now);
        if (expired.length === 0) return;

        for (const offer of expired) {
          await this.lock.release(
            offer.scheduleId,
            offer.startTime,
            String(offer.id),
          );
          await this.findNextMatch.execute({
            scheduleId: offer.scheduleId,
            startTime: offer.startTime,
            endTime: offer.endTime,
            clinicId: offer.clinicId,
          });
        }

        this.logger.log(
          `[WAITLIST] ${expired.length} ofertas expiradas y reofrecidas al siguiente en cola`,
        );
      },
    );
  }
}
