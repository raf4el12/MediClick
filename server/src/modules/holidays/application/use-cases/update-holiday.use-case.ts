import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateHolidayDto } from '../dto/update-holiday.dto.js';
import { HolidayResponseDto } from '../dto/holiday-response.dto.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import { UpdateHolidayData } from '../../domain/interfaces/holiday-data.interface.js';

@Injectable()
export class UpdateHolidayUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateHolidayDto,
  ): Promise<HolidayResponseDto> {
    const existing = await this.holidayRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Feriado no encontrado');
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

    // Manejar cambios de recurrencia
    if (dto.isRecurring !== undefined && dto.isRecurring !== existing.isRecurring) {
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
        }));
        await this.holidayRepository.createMany(copies);
      } else if (!dto.isRecurring && otherYears.length > 0) {
        // Desactivó recurrencia → eliminar copias de otros años
        await this.holidayRepository.deleteByNameAndYear(updated.name, otherYears);
      }
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
