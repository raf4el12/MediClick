import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';
import { AvailabilityResponseDto } from '../dto/availability-response.dto.js';
import type { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import type { UpdateAvailabilityData } from '../../domain/interfaces/availability-data.interface.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';
import {
  timeStringToDate,
  dateToTimeString,
} from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class UpdateAvailabilityUseCase {
  constructor(
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
    private readonly scheduleRegenerationService: ScheduleRegenerationService,
  ) {}

  async execute(
    id: number,
    dto: UpdateAvailabilityDto,
    clinicId?: number | null,
  ): Promise<AvailabilityResponseDto> {
    const existing = await this.availabilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Disponibilidad no encontrada');
    }

    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a esta disponibilidad');
    }

    const updateData: UpdateAvailabilityData = {};

    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.timeFrom) updateData.timeFrom = timeStringToDate(dto.timeFrom);
    if (dto.timeTo) updateData.timeTo = timeStringToDate(dto.timeTo);
    if (dto.isAvailable !== undefined) updateData.isAvailable = dto.isAvailable;
    if (dto.type) updateData.type = dto.type;
    if (dto.reason !== undefined) updateData.reason = dto.reason;

    const newTimeFrom = updateData.timeFrom ?? existing.timeFrom;
    const newTimeTo = updateData.timeTo ?? existing.timeTo;

    if (newTimeFrom >= newTimeTo) {
      throw new BadRequestException(
        'La hora de inicio debe ser menor a la hora de fin',
      );
    }

    if (dto.timeFrom || dto.timeTo) {
      const newStartDate = updateData.startDate ?? existing.startDate;
      const newEndDate = updateData.endDate ?? existing.endDate;

      const overlapping = await this.availabilityRepository.findOverlapping(
        existing.doctorId,
        existing.dayOfWeek,
        newTimeFrom,
        newTimeTo,
        id,
        newStartDate,
        newEndDate,
      );

      if (overlapping.length > 0) {
        throw new ConflictException(
          'El doctor ya tiene un horario que se solapa en ese día y rango de horas',
        );
      }
    }

    const updated = await this.availabilityRepository.update(id, updateData);

    // Regenerar schedules afectados por el cambio de disponibilidad.
    // startDate/endDate pueden ser null (REGULAR sin límite),
    // se usa hoy como inicio y 3 meses adelante como fin por defecto.
    const now = new Date();
    const fallbackStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const fallbackEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 0));

    const oldStart = existing.startDate ?? fallbackStart;
    const oldEnd = existing.endDate ?? fallbackEnd;
    const newStart = updated.startDate ?? fallbackStart;
    const newEnd = updated.endDate ?? fallbackEnd;

    const regenStart = oldStart < newStart ? oldStart : newStart;
    const regenEnd = oldEnd > newEnd ? oldEnd : newEnd;

    await this.scheduleRegenerationService.regenerateForDoctor(
      updated.doctorId,
      regenStart,
      regenEnd,
    );

    return {
      id: updated.id,
      doctorId: updated.doctorId,
      specialtyId: updated.specialtyId,
      startDate: updated.startDate,
      endDate: updated.endDate,
      dayOfWeek: updated.dayOfWeek,
      timeFrom: dateToTimeString(updated.timeFrom),
      timeTo: dateToTimeString(updated.timeTo),
      isAvailable: updated.isAvailable,
      type: updated.type,
      reason: updated.reason,
      doctor: {
        id: updated.doctor.id,
        name: updated.doctor.profile.name,
        lastName: updated.doctor.profile.lastName,
      },
      specialty: updated.specialty,
      createdAt: updated.createdAt,
    };
  }
}
