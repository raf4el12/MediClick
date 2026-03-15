import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';

@Injectable()
export class DeleteAvailabilityUseCase {
  constructor(
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
    private readonly scheduleRegenerationService: ScheduleRegenerationService,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.availabilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Disponibilidad no encontrada');
    }

    await this.availabilityRepository.softDelete(id);

    // Regenerar schedules: al eliminar una availability, los schedules
    // generados a partir de ella (sin citas) deben eliminarse
    await this.scheduleRegenerationService.regenerateForDoctor(
      existing.doctorId,
      existing.startDate,
      existing.endDate,
    );
  }
}
