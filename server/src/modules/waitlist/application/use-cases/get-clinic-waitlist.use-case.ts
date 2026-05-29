import { Injectable, Inject } from '@nestjs/common';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import { WaitlistEntryResponseDto } from '../dto/waitlist-response.dto.js';
import { toEntryDto } from '../dto/waitlist-dto.mapper.js';

/**
 * Dashboard de la clínica: cola activa, ordenada por prioridad y antigüedad.
 */
@Injectable()
export class GetClinicWaitlistUseCase {
  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
  ) {}

  async execute(
    clinicId: number | null,
    filters?: { specialtyId?: number; doctorId?: number },
  ): Promise<WaitlistEntryResponseDto[]> {
    const entries = await this.entryRepository.findActiveByClinic(
      clinicId,
      filters,
    );
    return entries.map(toEntryDto);
  }
}
