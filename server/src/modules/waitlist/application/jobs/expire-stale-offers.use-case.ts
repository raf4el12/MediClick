import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import { WaitlistLockService } from '../services/waitlist-lock.service.js';
import { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';

/**
 * Cada 30s expira las ofertas vencidas (paciente no respondió) y reofrece cada
 * slot al siguiente en cola. El lock se libera antes de reofrecer.
 */
@Injectable()
export class ExpireStaleOffersUseCase {
  private readonly logger = new Logger(ExpireStaleOffersUseCase.name);

  constructor(
    @Inject('IWaitlistOfferRepository')
    private readonly offerRepository: IWaitlistOfferRepository,
    private readonly lock: WaitlistLockService,
    private readonly findNextMatch: FindNextMatchUseCase,
  ) {}

  @Cron('*/30 * * * * *')
  async execute(): Promise<void> {
    const expired = await this.offerRepository.expireStaleReturning(new Date());
    if (expired.length === 0) return;

    for (const offer of expired) {
      await this.lock.release(offer.scheduleId, offer.startTime);
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
  }
}
