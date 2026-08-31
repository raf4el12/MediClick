import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import { AcceptOfferAtomicallyError } from '../../domain/repositories/waitlist-offer.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import { WaitlistLockService } from '../services/waitlist-lock.service.js';
import { AcceptOfferResponseDto } from '../dto/accept-offer-response.dto.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import { getAppointmentPaymentTimeoutMs } from '../../../../shared/utils/payment-timeout.util.js';
import type { WaitlistOfferAcceptedEvent } from '../events/waitlist-events.interface.js';

/**
 * SDD-013: la aceptación de una oferta se reduce a una única llamada
 * transaccional (`acceptOfferAtomically`). Antes, el claim, la creación de la
 * cita, la asignación de precio/plazo, el cierre de la entrada y el vínculo
 * de la oferta eran pasos separados (G-01): un fallo entre pasos podía dejar
 * una cita PENDING sin `pendingUntil`, o una oferta ACCEPTED sin cita
 * vinculada. Ahora todo eso ocurre dentro de la misma transacción
 * serializable en el repositorio.
 */
@Injectable()
export class AcceptOfferUseCase {
  private readonly logger = new Logger(AcceptOfferUseCase.name);

  constructor(
    @Inject('IWaitlistOfferRepository')
    private readonly offerRepository: IWaitlistOfferRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    private readonly lock: WaitlistLockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    userId: number,
    offerId: number,
  ): Promise<AcceptOfferResponseDto> {
    const offer = await this.offerRepository.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Oferta no encontrada');
    }

    // Autorización: la oferta debe pertenecer al paciente autenticado.
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient || patient.id !== offer.entry.patientId) {
      throw new ForbiddenException('Esta oferta no te pertenece');
    }

    const schedule = await this.scheduleRepository.findById(offer.scheduleId);
    const price = schedule?.specialty.price ?? null;
    const pendingUntil = new Date(
      Date.now() + getAppointmentPaymentTimeoutMs(),
    );

    let accepted;
    try {
      // Claim + revalidación de overlap + creación de cita con amount/pendingUntil
      // + cierre de entrada + vínculo de oferta, todo en una única transacción
      // serializable. Un doble-click o una reserva directa concurrente falla
      // aquí con un resultado consistente, nunca a medio camino.
      accepted = await this.offerRepository.acceptOfferAtomically({
        offerId,
        patientId: patient.id,
        now: new Date(),
        pendingUntil,
        amount: price && price > 0 ? price : null,
        reason: 'Reserva desde lista de espera',
      });
    } catch (error) {
      if (error instanceof AcceptOfferAtomicallyError) {
        if (error.reason === 'OFFER_NOT_CLAIMABLE') {
          throw new ConflictException(
            'La oferta ya no está disponible (fue aceptada o expiró)',
          );
        }
        // SLOT_OVERLAP: el slot fue tomado entre la oferta y la aceptación.
        // Liberamos el lock (identificado por offerId) para que el siguiente
        // en cola pueda recibirlo; el paciente sigue activo en la lista de
        // espera (la entrada no se cerró porque la transacción completa hizo
        // rollback).
        await this.lock.release(
          offer.scheduleId,
          offer.startTime,
          String(offer.id),
        );
        throw new ConflictException(
          'El horario ya fue tomado. Sigues en la lista de espera para el próximo cupo.',
        );
      }
      throw error;
    }

    await this.lock.release(
      offer.scheduleId,
      offer.startTime,
      String(offer.id),
    );

    const profile = offer.entry.patient.profile;
    const acceptedEvent: WaitlistOfferAcceptedEvent = {
      offerId,
      appointmentId: accepted.appointment.id,
      patientUserId: profile.userId,
      patientName: `${profile.name} ${profile.lastName}`,
      doctorName: `${accepted.appointment.schedule.doctor.profile.name} ${accepted.appointment.schedule.doctor.profile.lastName}`,
      clinicId: offer.clinicId,
    };
    this.eventEmitter.emit('waitlist.offer.accepted', acceptedEvent);

    this.logger.log(
      `[WAITLIST] Oferta ${offerId} aceptada por paciente ${patient.id} → cita ${accepted.appointment.id} (PENDING pago hasta ${pendingUntil.toISOString()})`,
    );

    return {
      appointmentId: accepted.appointment.id,
      scheduleId: accepted.appointment.scheduleId,
      startTime: dateToTimeString(accepted.appointment.startTime),
      endTime: dateToTimeString(accepted.appointment.endTime),
      status: accepted.appointment.status,
      paymentStatus: accepted.appointment.paymentStatus,
      amount: accepted.appointment.amount,
      pendingUntil: accepted.appointment.pendingUntil,
    };
  }
}
