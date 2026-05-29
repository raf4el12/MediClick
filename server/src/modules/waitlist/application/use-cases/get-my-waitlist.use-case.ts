import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import {
  WaitlistEntryResponseDto,
  WaitlistOfferResponseDto,
} from '../dto/waitlist-response.dto.js';
import { toEntryDto, toOfferDto } from '../dto/waitlist-dto.mapper.js';

/**
 * Consultas del paciente autenticado: sus entradas en cola y sus ofertas vigentes.
 */
@Injectable()
export class GetMyWaitlistUseCase {
  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
    @Inject('IWaitlistOfferRepository')
    private readonly offerRepository: IWaitlistOfferRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  private async resolvePatientId(userId: number): Promise<number> {
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundException(
        'No se encontró un perfil de paciente asociado a tu cuenta',
      );
    }
    return patient.id;
  }

  async getMyEntries(userId: number): Promise<WaitlistEntryResponseDto[]> {
    const patientId = await this.resolvePatientId(userId);
    const entries = await this.entryRepository.findByPatient(patientId);
    return entries.map(toEntryDto);
  }

  async getMyPendingOffers(
    userId: number,
  ): Promise<WaitlistOfferResponseDto[]> {
    const patientId = await this.resolvePatientId(userId);
    const offers = await this.offerRepository.findPendingByPatient(patientId);
    return offers.map(toOfferDto);
  }
}
