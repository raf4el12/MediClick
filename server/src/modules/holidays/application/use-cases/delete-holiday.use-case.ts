import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';

@Injectable()
export class DeleteHolidayUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.holidayRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Feriado no encontrado');
    }

    await this.holidayRepository.delete(id);
  }
}
