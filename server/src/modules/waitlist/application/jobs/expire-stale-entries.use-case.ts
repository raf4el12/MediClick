import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';

/**
 * Cada 15 min marca como EXPIRED las entradas cuya ventana de búsqueda
 * (waitUntil) ya pasó, para que dejen de competir en el matcher.
 */
@Injectable()
export class ExpireStaleEntriesUseCase {
  private readonly logger = new Logger(ExpireStaleEntriesUseCase.name);

  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
  ) {}

  @Cron('0 */15 * * * *')
  async execute(): Promise<void> {
    const count = await this.entryRepository.expireStale(new Date());
    if (count > 0) {
      this.logger.log(`[WAITLIST] ${count} entradas de lista de espera expiradas`);
    }
  }
}
