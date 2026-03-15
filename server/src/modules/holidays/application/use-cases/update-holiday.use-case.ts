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
      const parsedDate = new Date(dto.date);
      updateData.date = parsedDate;
      updateData.year = parsedDate.getFullYear();
    }

    if (dto.isRecurring !== undefined) {
      updateData.isRecurring = dto.isRecurring;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.holidayRepository.update(id, updateData);

    return {
      id: updated.id,
      name: updated.name,
      date: updated.date,
      year: updated.year,
      isRecurring: updated.isRecurring,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    };
  }
}
