import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';
import { AvailabilityResponseDto } from '../dto/availability-response.dto.js';
import type { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import type { UpdateAvailabilityData } from '../../domain/interfaces/availability-data.interface.js';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class UpdateAvailabilityUseCase {
  constructor(
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    const existing = await this.availabilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Disponibilidad no encontrada');
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
      const overlapping = await this.availabilityRepository.findOverlapping(
        existing.doctorId,
        existing.dayOfWeek,
        newTimeFrom,
        newTimeTo,
        id,
      );

      if (overlapping.length > 0) {
        throw new ConflictException(
          'El doctor ya tiene un horario que se solapa en ese día y rango de horas',
        );
      }
    }

    const updated = await this.availabilityRepository.update(id, updateData);

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
