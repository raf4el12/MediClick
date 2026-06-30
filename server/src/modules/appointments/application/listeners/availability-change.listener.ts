import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { timeRangesOverlap } from '../../../../shared/utils/date-time.utils.js';
import {
  SCHEDULE_BLOCKED_EVENT,
  HOLIDAY_CREATED_EVENT,
  SLOT_RELEASED_EVENT,
  type ScheduleBlockedEvent,
  type HolidayCreatedEvent,
} from '../../../../shared/events/availability-events.interface.js';
import {
  buildAppointmentCancelledEvent,
  buildSlotReleasedEvent,
} from '../services/appointment-event.builder.js';

/**
 * Cancela las citas ya reservadas que quedan invalidadas cuando se crea un
 * bloqueo de horario o un feriado, y reofrece cada slot liberado a la lista de
 * espera (vía `appointment.slot_released`).
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(SCHEDULE_BLOCKED_EVENT, { async: true })
  async handleScheduleBlocked(event: ScheduleBlockedEvent): Promise<void> {
    const appointments =
      await this.appointmentRepository.findActiveByDoctorAndDateRange(
        event.doctorId,
        event.startDate,
        event.endDate,
      );

    // FULL_DAY invalida todo; TIME_RANGE solo las citas que solapan la franja.
    const affected =
      event.type === 'TIME_RANGE' && event.timeFrom && event.timeTo
        ? appointments.filter((a) =>
            timeRangesOverlap(
              a.startTime,
              a.endTime,
              event.timeFrom!,
              event.timeTo!,
            ),
          )
        : appointments;

    await this.cancelAll(
      affected,
      event.reason
        ? `Bloqueo de agenda: ${event.reason}`
        : 'Bloqueo de agenda del doctor',
    );
  }

  @OnEvent(HOLIDAY_CREATED_EVENT, { async: true })
  async handleHolidayCreated(event: HolidayCreatedEvent): Promise<void> {
    const appointments =
      await this.appointmentRepository.findActiveByDateAndClinic(
        event.date,
        event.clinicId,
      );

    await this.cancelAll(appointments, `Feriado: ${event.name}`);
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
