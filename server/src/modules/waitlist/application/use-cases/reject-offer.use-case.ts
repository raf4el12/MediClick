import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { WaitlistLockService } from '../services/waitlist-lock.service.js';
import { FindNextMatchUseCase } from './find-next-match.use-case.js';

@Injectable()
export class RejectOfferUseCase {
  private readonly logger = new Logger(RejectOfferUseCase.name);

  constructor(
    @Inject('IWaitlistOfferRepository')
    private readonly offerRepository: IWaitlistOfferRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    private readonly lock: WaitlistLockService,
    private readonly findNextMatch: FindNextMatchUseCase,
  ) {}

  async execute(userId: number, offerId: number): Promise<void> {
    const offer = await this.offerRepository.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Oferta no encontrada');
    }

    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient || patient.id !== offer.entry.patientId) {
      throw new ForbiddenException('Esta oferta no te pertenece');
    }

    const rejected = await this.offerRepository.markRejected(offerId);
    if (!rejected) {
      throw new BadRequestException(
        'La oferta ya no está pendiente (fue aceptada o expiró)',
      );
    }

    // La entrada del paciente sigue ACTIVE: rechazar este slot no lo saca de la cola.
    // Liberamos el lock y reofrecemos el slot al siguiente candidato.
    await this.lock.release(offer.scheduleId, offer.startTime);
    await this.findNextMatch.execute({
      scheduleId: offer.scheduleId,
      startTime: offer.startTime,
      endTime: offer.endTime,
      clinicId: offer.clinicId,
    });

    this.logger.log(
      `[WAITLIST] Oferta ${offerId} rechazada por paciente ${patient.id}; slot reofrecido`,
    );
  }
}
