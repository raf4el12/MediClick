import { Injectable, Inject } from '@nestjs/common';
import { CreateHolidayDto } from '../dto/create-holiday.dto.js';
import { HolidayResponseDto } from '../dto/holiday-response.dto.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';

@Injectable()
export class CreateHolidayUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(dto: CreateHolidayDto): Promise<HolidayResponseDto> {
    const parsedDate = new Date(dto.date);
    const year = parsedDate.getFullYear();

    const holiday = await this.holidayRepository.create({
      name: dto.name,
      date: parsedDate,
      year,
      isRecurring: dto.isRecurring ?? false,
    });

    return {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      year: holiday.year,
      isRecurring: holiday.isRecurring,
      isActive: holiday.isActive,
      createdAt: holiday.createdAt,
    };
  }
}
