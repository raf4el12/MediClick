import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';

@Injectable()
export class LeaveWaitlistUseCase {
  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(userId: number, entryId: number): Promise<void> {
    const entry = await this.entryRepository.findById(entryId);
    if (!entry) {
      throw new NotFoundException('Entrada de lista de espera no encontrada');
    }

    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient || patient.id !== entry.patientId) {
      throw new ForbiddenException('Esta entrada no te pertenece');
    }

    if (entry.status !== WaitlistEntryStatus.ACTIVE) {
      throw new BadRequestException('La entrada ya no está activa');
    }

    await this.entryRepository.update(entryId, {
      status: WaitlistEntryStatus.CANCELLED,
    });
  }
}
