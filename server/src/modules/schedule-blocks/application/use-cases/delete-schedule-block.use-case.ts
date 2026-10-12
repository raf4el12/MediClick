import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';
import {
  AVAILABILITY_RESTRICTION_LIFTED_EVENT,
  type AvailabilityRestrictionLiftedEvent,
} from '../../../../shared/events/availability-events.interface.js';
import { liftedDayRanges } from '../../../../shared/events/availability-restriction-ranges.js';

@Injectable()
export class DeleteScheduleBlockUseCase {
  constructor(
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
    private readonly scheduleRegenerationService: ScheduleRegenerationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: number,
    clinicId: number | null | undefined,
    actorId: number,
  ): Promise<void> {
    const existing = await this.scheduleBlockRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Bloqueo de horario no encontrado');
    }

    // Staff can only delete blocks for doctors of their own clinic
    if (clinicId && existing.doctor.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este bloqueo de horario');
    }

    await this.scheduleBlockRepository.softDelete(id);

    // Al eliminar un bloqueo, regenerar schedules para que se creen
    // los slots que antes estaban bloqueados
    await this.scheduleRegenerationService.regenerateForDoctor(
      existing.doctorId,
      existing.startDate,
      existing.endDate,
    );

    // Un bloqueo inactivo ya no restringía nada: no hay cupos que reofrecer.
    if (!existing.isActive) return;

    const liftedEvent: AvailabilityRestrictionLiftedEvent = {
      restrictionType: 'SCHEDULE_BLOCK',
      restrictionId: existing.id,
      clinicId: existing.doctor.clinicId,
      doctorId: existing.doctorId,
      liftedRanges: liftedDayRanges(
        { startDate: existing.startDate, endDate: existing.endDate },
        null,
      ),
      occurredAt: new Date(),
      actorId,
    };
    this.eventEmitter.emit(AVAILABILITY_RESTRICTION_LIFTED_EVENT, liftedEvent);
  }
}
