import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import {
  AVAILABILITY_RESTRICTION_CHANGED_EVENT,
  SLOT_RELEASED_EVENT,
  type AvailabilityRestrictionChangedEvent,
  type AvailabilityRestrictionRange,
} from '../../../../shared/events/availability-events.interface.js';
import {
  buildAppointmentCancelledEvent,
  buildSlotReleasedEvent,
} from '../services/appointment-event.builder.js';

/**
 * Cancela las citas ya reservadas que quedan invalidadas después de crear o
 * actualizar una restricción de disponibilidad, y reofrece cada slot liberado
 * a la lista de espera (vía `appointment.slot_released`).
 *
 * Vive en el módulo appointments (tiene el repo) y reacciona por eventos para no
 * crear un ciclo de módulos con schedule-blocks/holidays.
 */
@Injectable()
export class AvailabilityChangeListener {
  private readonly logger = new Logger(AvailabilityChangeListener.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AVAILABILITY_RESTRICTION_CHANGED_EVENT, { async: true })
  async handleAvailabilityRestrictionChanged(
    event: AvailabilityRestrictionChangedEvent,
  ): Promise<void> {
    const range = this.unionRange(event.previousRange, event.currentRange);
    if (!range) {
      this.logger.warn(
        `Cambio de restricción ${event.restrictionId} sin rango para evaluar`,
      );
      return;
    }

    if (event.restrictionType === 'HOLIDAY') {
      await this.handleHolidayRestriction(event, range);
      return;
    }

    await this.handleScheduleBlockRestriction(event, range);
  }

  private async handleHolidayRestriction(
    event: AvailabilityRestrictionChangedEvent,
    range: AvailabilityRestrictionRange,
  ): Promise<void> {
    const appointments =
      await this.appointmentRepository.findActiveByDateRangeAndClinic(
        range.startDate,
        range.endDate,
        event.clinicId,
      );

    const affected: AppointmentWithRelations[] = [];
    for (const appointment of appointments) {
      const clinicId =
        appointment.clinicId ?? appointment.schedule.doctor.clinic?.id;
      if (
        await this.holidayRepository.isHoliday(
          appointment.schedule.scheduleDate,
          clinicId,
        )
      ) {
        affected.push(appointment);
      }
    }

    await this.cancelAll(affected, 'Feriado vigente');
  }

  private async handleScheduleBlockRestriction(
    event: AvailabilityRestrictionChangedEvent,
    range: AvailabilityRestrictionRange,
  ): Promise<void> {
    if (event.doctorId === null) {
      this.logger.warn(
        `Bloqueo ${event.restrictionId} sin médico para evaluar`,
      );
      return;
    }

    const appointments =
      await this.appointmentRepository.findActiveByDoctorAndDateRange(
        event.doctorId,
        range.startDate,
        range.endDate,
      );

    const affected: AppointmentWithRelations[] = [];
    for (const appointment of appointments) {
      if (
        await this.scheduleBlockRepository.isBlocked(
          appointment.schedule.doctor.id,
          appointment.schedule.scheduleDate,
          appointment.startTime,
          appointment.endTime,
        )
      ) {
        affected.push(appointment);
      }
    }

    await this.cancelAll(affected, 'Bloqueo de agenda vigente');
  }

  private unionRange(
    previousRange: AvailabilityRestrictionRange | null,
    currentRange: AvailabilityRestrictionRange | null,
  ): AvailabilityRestrictionRange | null {
    const ranges = [previousRange, currentRange].filter(
      (range): range is AvailabilityRestrictionRange => range !== null,
    );
    if (ranges.length === 0) return null;

    return {
      startDate: ranges.reduce(
        (earliest, range) =>
          range.startDate < earliest ? range.startDate : earliest,
        ranges[0].startDate,
      ),
      endDate: ranges.reduce(
        (latest, range) => (range.endDate > latest ? range.endDate : latest),
        ranges[0].endDate,
      ),
    };
  }

  /**
   * Cancela cada cita, reofrece el slot a la waitlist (`slot_released`, siempre)
   * y notifica al paciente (`appointment.cancelled`, solo si tiene usuario).
   */
  private async cancelAll(
    appointments: AppointmentWithRelations[],
    reason: string,
  ): Promise<void> {
    if (appointments.length === 0) return;

    let cancelled = 0;
    for (const appt of appointments) {
      try {
        const updated = await this.appointmentRepository.update(appt.id, {
          status: AppointmentStatus.CANCELLED,
          cancelReason: reason,
          updatedAt: new Date(),
        });

        this.eventEmitter.emit(
          SLOT_RELEASED_EVENT,
          buildSlotReleasedEvent(updated),
        );

        const cancelledEvent = buildAppointmentCancelledEvent(
          updated,
          reason,
          updated.clinicId,
        );
        if (cancelledEvent) {
          this.eventEmitter.emit('appointment.cancelled', cancelledEvent);
        }

        cancelled++;
      } catch (error) {
        this.logger.error(
          `Error cancelando cita ${appt.id} por cambio de disponibilidad: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `[AUDIT] Canceladas ${cancelled}/${appointments.length} citas por cambio de disponibilidad (${reason})`,
    );
  }
}
