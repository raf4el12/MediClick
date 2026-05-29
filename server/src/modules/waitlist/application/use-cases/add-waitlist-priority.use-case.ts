import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistEntryResponseDto } from '../dto/waitlist-response.dto.js';
import { toEntryDto } from '../dto/waitlist-dto.mapper.js';

/**
 * Boost de prioridad (CLINIC_ADMIN): adelanta a un paciente en la cola.
 */
@Injectable()
export class AddWaitlistPriorityUseCase {
  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
  ) {}

  async execute(
    entryId: number,
    delta: number,
  ): Promise<WaitlistEntryResponseDto> {
    const entry = await this.entryRepository.findById(entryId);
    if (!entry) {
      throw new NotFoundException('Entrada de lista de espera no encontrada');
    }
    if (entry.status !== WaitlistEntryStatus.ACTIVE) {
      throw new BadRequestException(
        'Solo se puede priorizar una entrada activa',
      );
    }

    const updated = await this.entryRepository.incrementPriority(
      entryId,
      delta,
    );
    return toEntryDto(updated);
  }
}
