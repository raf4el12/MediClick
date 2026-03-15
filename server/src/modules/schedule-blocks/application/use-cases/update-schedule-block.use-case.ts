import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateScheduleBlockDto } from '../dto/update-schedule-block.dto.js';
import { ScheduleBlockResponseDto } from '../dto/schedule-block-response.dto.js';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import { UpdateScheduleBlockData } from '../../domain/interfaces/schedule-block-data.interface.js';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

function dateToTimeString(date: Date | null): string | null {
  if (!date) return null;
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class UpdateScheduleBlockUseCase {
  constructor(
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateScheduleBlockDto,
  ): Promise<ScheduleBlockResponseDto> {
    const existing = await this.scheduleBlockRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Bloqueo de horario no encontrado');
    }

    // Determinar el tipo final (el actual o el nuevo si se cambia)
    const finalType = dto.type ?? existing.type;

    // Si el tipo final es TIME_RANGE, validar que se tengan las horas
    if (finalType === 'TIME_RANGE') {
      const finalTimeFrom = dto.timeFrom !== undefined ? dto.timeFrom : dateToTimeString(existing.timeFrom);
      const finalTimeTo = dto.timeTo !== undefined ? dto.timeTo : dateToTimeString(existing.timeTo);

      if (!finalTimeFrom || !finalTimeTo) {
        throw new BadRequestException(
          'Para bloqueos de tipo TIME_RANGE, timeFrom y timeTo son obligatorios',
        );
      }

      const from = timeStringToDate(finalTimeFrom);
      const to = timeStringToDate(finalTimeTo);

      if (from >= to) {
        throw new BadRequestException(
          'La hora de inicio (timeFrom) debe ser anterior a la hora de fin (timeTo)',
        );
      }
    }

    // Construir datos de actualización
    const updateData: UpdateScheduleBlockData = {};

    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.timeFrom !== undefined) {
      updateData.timeFrom = dto.timeFrom ? timeStringToDate(dto.timeFrom) : null;
    }
    if (dto.timeTo !== undefined) {
      updateData.timeTo = dto.timeTo ? timeStringToDate(dto.timeTo) : null;
    }

    // Si se cambia a FULL_DAY, limpiar las horas
    if (dto.type === 'FULL_DAY') {
      updateData.timeFrom = null;
      updateData.timeTo = null;
    }

    const updated = await this.scheduleBlockRepository.update(id, updateData);

    return {
      id: updated.id,
      doctorId: updated.doctorId,
      type: updated.type,
      startDate: updated.startDate,
      endDate: updated.endDate,
      timeFrom: dateToTimeString(updated.timeFrom),
      timeTo: dateToTimeString(updated.timeTo),
      reason: updated.reason,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      doctor: {
        id: updated.doctor.id,
        name: updated.doctor.profile.name,
        lastName: updated.doctor.profile.lastName,
      },
    };
  }
}
