import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { ScheduleWithRelations } from '../../../schedules/domain/interfaces/schedule-data.interface.js';
import type { WaitlistOfferWithEntry } from '../../domain/interfaces/waitlist-data.interface.js';
import { WaitlistLockService } from '../services/waitlist-lock.service.js';
import { matchingBuckets } from '../../domain/utils/waitlist-time.util.js';
import { OFFER_TTL_MINUTES } from '../../domain/constants/waitlist.constants.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';
import type { WaitlistOfferCreatedEvent } from '../events/waitlist-events.interface.js';

export interface FindNextMatchInput {
  scheduleId: number;
  startTime: Date;
  endTime: Date;
  clinicId: number | null;
}

/**
 * Núcleo del auto-fill: dado un slot recién liberado, ofrece el hueco al
 * primer paciente en cola que lo matchea. Toma un lock por slot para que no
 * se ofrezca en paralelo; el lock se mantiene mientras la oferta esté viva y
 * lo liberan accept/reject/expiración.
 */
@Injectable()
export class FindNextMatchUseCase {
  private readonly logger = new Logger(FindNextMatchUseCase.name);

  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
    @Inject('IWaitlistOfferRepository')
    private readonly offerRepository: IWaitlistOfferRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly lock: WaitlistLockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: FindNextMatchInput,
  ): Promise<WaitlistOfferWithEntry | null> {
    // 1. Lock del slot con un token temporal, solo válido durante esta
    //    búsqueda. Si ya está tomado (por cualquier dueño), otro proceso lo
    //    está manejando.
    const searchToken = this.lock.createToken();
    const locked = await this.lock.acquire(
      input.scheduleId,
      input.startTime,
      searchToken,
    );
    if (!locked) return null;

    try {
      // 2. Cargar el schedule para conocer doctor/especialidad/fecha.
      const schedule = await this.scheduleRepository.findById(input.scheduleId);
      if (!schedule) {
        await this.lock.release(input.scheduleId, input.startTime, searchToken);
        return null;
      }

      // 3. Confirmar que el slot sigue libre (la cita pudo recrearse entre medio).
      const occupied =
        await this.appointmentRepository.hasOverlappingAppointment(
          input.scheduleId,
          input.startTime,
          input.endTime,
        );
      if (occupied) {
        await this.lock.release(input.scheduleId, input.startTime, searchToken);
        return null;
      }

      // 4. Buscar el primer paciente en cola.
      const entry = await this.entryRepository.findNextMatch({
        clinicId: input.clinicId,
        specialtyId: schedule.specialtyId,
        doctorId: schedule.doctorId,
        scheduleDate: schedule.scheduleDate,
        timeBuckets: matchingBuckets(input.startTime),
        scheduleId: input.scheduleId,
        startTime: input.startTime,
      });
      if (!entry) {
        await this.lock.release(input.scheduleId, input.startTime, searchToken);
        return null;
      }

      // 5. Crear la oferta con deadline. El lock NO se libera: se transfiere
      //    al offerId, el único identificador estable que accept/reject/
      //    expiración conocerán más adelante para poder liberarlo ellos
      //    mismos. Queda reservado para este paciente hasta que resuelva.
      const expiresAt = new Date(Date.now() + OFFER_TTL_MINUTES * 60 * 1000);
      const offer = await this.offerRepository.create({
        waitlistEntryId: entry.id,
        scheduleId: input.scheduleId,
        startTime: input.startTime,
        endTime: input.endTime,
        expiresAt,
        clinicId: input.clinicId,
      });
      await this.transferLockToOffer(
        input.scheduleId,
        input.startTime,
        searchToken,
        offer.id,
      );

      this.eventEmitter.emit(
        'waitlist.offer.created',
        this.toCreatedEvent(offer, schedule),
      );

      this.logger.log(
        `[WAITLIST] Oferta ${offer.id} creada para entry ${entry.id} (paciente ${entry.patientId}) — slot schedule ${input.scheduleId} @ ${input.startTime.toISOString()}`,
      );

      return offer;
    } catch (error) {
      // Ante cualquier fallo liberamos el lock (con el token de búsqueda; si
      // ya fue transferido al offerId, este release es un no-op seguro) para
      // no congelar el slot.
      await this.lock.release(input.scheduleId, input.startTime, searchToken);
      this.logger.error(
        `[WAITLIST] Error buscando match para schedule ${input.scheduleId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  /**
   * Reemplaza el token temporal de búsqueda por el `offerId` (como string),
   * el único valor que accept/reject/expiración tendrán disponible para
   * liberar este lock más adelante. La ventana entre release+acquire es
   * mínima y aceptable: en el peor caso alguien más gana el slot vacío por
   * un instante, pero la oferta recién creada y el estado de BD siguen
   * siendo la autoridad final — el lock es solo coordinación (SDD-013 §6.4.2).
   */
  private async transferLockToOffer(
    scheduleId: number,
    startTime: Date,
    searchToken: string,
    offerId: number,
  ): Promise<void> {
    await this.lock.release(scheduleId, startTime, searchToken);
    await this.lock.acquire(scheduleId, startTime, String(offerId));
  }

  private toCreatedEvent(
    offer: WaitlistOfferWithEntry,
    schedule: ScheduleWithRelations,
  ): WaitlistOfferCreatedEvent {
    const profile = offer.entry.patient.profile;
    return {
      offerId: offer.id,
      waitlistEntryId: offer.waitlistEntryId,
      patientUserId: profile.userId,
      patientEmail: profile.email,
      patientName: `${profile.name} ${profile.lastName}`,
      doctorName: `${schedule.doctor.profile.name} ${schedule.doctor.profile.lastName}`,
      specialtyName: schedule.specialty.name,
      clinicTimezone: schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
      scheduleDate: schedule.scheduleDate,
      startTime: offer.startTime,
      endTime: offer.endTime,
      expiresAt: offer.expiresAt,
      clinicId: offer.clinicId,
    };
  }
}
