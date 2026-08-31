import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateHolidayDto } from '../dto/update-holiday.dto.js';
import { HolidayResponseDto } from '../dto/holiday-response.dto.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import { UpdateHolidayData } from '../../domain/interfaces/holiday-data.interface.js';
import type { HolidayEntity } from '../../domain/entities/holiday.entity.js';
import {
  AVAILABILITY_RESTRICTION_CHANGED_EVENT,
  type AvailabilityRestrictionChangedEvent,
} from '../../../../shared/events/availability-events.interface.js';

@Injectable()
export class UpdateHolidayUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: number,
    dto: UpdateHolidayDto,
    actorId: number,
    clinicId?: number | null,
  ): Promise<HolidayResponseDto> {
    const existing = await this.holidayRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Feriado no encontrado');
    }

    // Clinic-scoped staff cannot modify global holidays (clinicId=null — owned by super-admin)
    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este feriado');
    }

    const updateData: UpdateHolidayData = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.date !== undefined) {
      const parsedDate = new Date(`${dto.date.split('T')[0]}T12:00:00Z`);
      updateData.date = parsedDate;
      updateData.year = parsedDate.getUTCFullYear();
    }

    if (dto.isRecurring !== undefined) {
      updateData.isRecurring = dto.isRecurring;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.holidayRepository.update(id, updateData);
    const createdRecurringHolidays: HolidayEntity[] = [];

    // Manejar cambios de recurrencia
    if (
      dto.isRecurring !== undefined &&
      dto.isRecurring !== existing.isRecurring
    ) {
      const existingYears = await this.holidayRepository.findDistinctYears();
      const otherYears = existingYears.filter((y) => y !== updated.year);

      if (dto.isRecurring && otherYears.length > 0) {
        // Activó recurrencia → propagar a otros años
        const month = updated.date.getUTCMonth();
        const day = updated.date.getUTCDate();
        const copies = otherYears.map((y) => ({
          name: updated.name,
          date: new Date(Date.UTC(y, month, day, 12, 0, 0)),
          year: y,
          isRecurring: true,
          clinicId: updated.clinicId ?? undefined,
        }));
        const createdCopies =
          await this.holidayRepository.createManyAndReturn(copies);
        createdRecurringHolidays.push(...createdCopies);
      } else if (!dto.isRecurring && otherYears.length > 0) {
        // Desactivó recurrencia → eliminar copias de otros años
        await this.holidayRepository.deleteByNameAndYear(
          updated.name,
          otherYears,
        );
      }
    }

    const restrictionEvent: AvailabilityRestrictionChangedEvent = {
      restrictionType: 'HOLIDAY',
      restrictionId: updated.id,
      clinicId: updated.clinicId,
      doctorId: null,
      previousRange: {
        startDate: existing.date,
        endDate: existing.date,
      },
      currentRange: {
        startDate: updated.date,
        endDate: updated.date,
      },
      occurredAt: new Date(),
      actorId,
    };
    this.eventEmitter.emit(
      AVAILABILITY_RESTRICTION_CHANGED_EVENT,
      restrictionEvent,
    );

    for (const createdHoliday of createdRecurringHolidays) {
      this.eventEmitter.emit(AVAILABILITY_RESTRICTION_CHANGED_EVENT, {
        restrictionType: 'HOLIDAY',
        restrictionId: createdHoliday.id,
        clinicId: createdHoliday.clinicId,
        doctorId: null,
        previousRange: null,
        currentRange: {
          startDate: createdHoliday.date,
          endDate: createdHoliday.date,
        },
        occurredAt: new Date(),
        actorId,
      } satisfies AvailabilityRestrictionChangedEvent);
    }

    return {
      id: updated.id,
      name: updated.name,
      date: updated.date,
      year: updated.year,
      isRecurring: updated.isRecurring,
      isActive: updated.isActive,
      clinicId: updated.clinicId,
      createdAt: updated.createdAt,
    };
  }
}
