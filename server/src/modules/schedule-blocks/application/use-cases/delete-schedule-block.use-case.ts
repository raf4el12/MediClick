import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';

@Injectable()
export class DeleteScheduleBlockUseCase {
  constructor(
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.scheduleBlockRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Bloqueo de horario no encontrado');
    }

    await this.scheduleBlockRepository.softDelete(id);
  }
}
