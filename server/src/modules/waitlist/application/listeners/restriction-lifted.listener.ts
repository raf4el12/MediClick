import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AVAILABILITY_RESTRICTION_LIFTED_EVENT,
  type AvailabilityRestrictionLiftedEvent,
  type AvailabilityRestrictionRange,
} from '../../../../shared/events/availability-events.interface.js';
import {
  FreeSlotsService,
  type FreeSlot,
} from '../../../schedules/domain/services/free-slots.service.js';
import { GenerateSchedulesUseCase } from '../../../schedules/application/use-cases/generate-schedules.use-case.js';
import { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Cuando un bloqueo o feriado deja de aplicar, ofrece a la lista de espera
 * cada cupo del rango liberado que quedó libre de verdad. `FindNextMatch`
 * toma el lock por cupo y garantiza una sola oferta pendiente por paciente,
 * así que cada cupo va, como mucho, a un paciente distinto.
 */
@Injectable()
export class RestrictionLiftedListener {
  private readonly logger = new Logger(RestrictionLiftedListener.name);

  constructor(
    private readonly freeSlots: FreeSlotsService,
    private readonly generateSchedules: GenerateSchedulesUseCase,
    private readonly findNextMatch: FindNextMatchUseCase,
  ) {}

  @OnEvent(AVAILABILITY_RESTRICTION_LIFTED_EVENT, { async: true })
  async handle(event: AvailabilityRestrictionLiftedEvent): Promise<void> {
    if (event.restrictionType === 'SCHEDULE_BLOCK' && event.doctorId === null) {
      this.logger.warn(
        `Bloqueo ${event.restrictionId} levantado sin médico para evaluar`,
      );
      return;
    }

    const slots = new Map<string, FreeSlot>();
    for (const range of event.liftedRanges) {
      if (event.restrictionType === 'HOLIDAY') {
        await this.fillHolidayGaps(event, range);
      }
      const found = await this.freeSlots.find({
        ...(event.restrictionType === 'SCHEDULE_BLOCK'
          ? { doctorId: event.doctorId as number }
          : event.clinicId !== null
            ? { clinicId: event.clinicId }
            : {}),
        from: range.startDate,
        to: range.endDate,
      });
      for (const slot of found) {
        slots.set(`${slot.scheduleId}@${slot.startTime.toISOString()}`, slot);
      }
    }

    let offered = 0;
    for (const slot of slots.values()) {
      try {
        const offer = await this.findNextMatch.execute(slot);
        if (offer) offered++;
      } catch (error) {
        this.logger.error(
          `[WAITLIST] Error reofreciendo cupo schedule ${slot.scheduleId} @ ${slot.startTime.toISOString()}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `[WAITLIST] ${event.restrictionType} ${event.restrictionId} levantado: ${slots.size} cupos libres evaluados, ${offered} ofertas creadas`,
    );
  }

  /**
   * La generación de agenda omite los feriados, así que el día liberado puede
   * no tener bloques de agenda. Se generan los que falten (sin borrar nada)
   * para los médicos de la sede, o de todas si el feriado era global.
   */
  private async fillHolidayGaps(
    event: AvailabilityRestrictionLiftedEvent,
    range: AvailabilityRestrictionRange,
  ): Promise<void> {
    try {
      await this.generateSchedules.execute(
        { dateFrom: dayKey(range.startDate), dateTo: dayKey(range.endDate) },
        event.clinicId,
      );
    } catch (error) {
      this.logger.error(
        `[WAITLIST] Error generando agenda tras levantar feriado ${event.restrictionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
