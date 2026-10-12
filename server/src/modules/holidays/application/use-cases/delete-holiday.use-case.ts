import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import {
  AVAILABILITY_RESTRICTION_LIFTED_EVENT,
  type AvailabilityRestrictionLiftedEvent,
} from '../../../../shared/events/availability-events.interface.js';
import { liftedDayRanges } from '../../../../shared/events/availability-restriction-ranges.js';

@Injectable()
export class DeleteHolidayUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: number,
    clinicId: number | null | undefined,
    actorId: number,
  ): Promise<void> {
    const existing = await this.holidayRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Feriado no encontrado');
    }

    // Clinic-scoped staff cannot delete global holidays (clinicId=null — owned by super-admin)
    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este feriado');
    }

    await this.holidayRepository.delete(id);

    // Un feriado inactivo ya no restringía nada: no hay cupos que reofrecer.
    if (!existing.isActive) return;

    const liftedEvent: AvailabilityRestrictionLiftedEvent = {
      restrictionType: 'HOLIDAY',
      restrictionId: existing.id,
      clinicId: existing.clinicId,
      doctorId: null,
      liftedRanges: liftedDayRanges(
        { startDate: existing.date, endDate: existing.date },
        null,
      ),
      occurredAt: new Date(),
      actorId,
    };
    this.eventEmitter.emit(AVAILABILITY_RESTRICTION_LIFTED_EVENT, liftedEvent);
  }
}
