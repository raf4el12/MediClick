import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';

@Injectable()
export class DeleteScheduleBlockUseCase {
  constructor(
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
    private readonly scheduleRegenerationService: ScheduleRegenerationService,
  ) {}

  async execute(id: number, clinicId?: number | null): Promise<void> {
    const existing = await this.scheduleBlockRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Bloqueo de horario no encontrado');
    }

    // Staff can only delete blocks for doctors of their own clinic
    if (clinicId && existing.doctor.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este bloqueo de horario');
    }

    await this.scheduleBlockRepository.softDelete(id);

    // Al eliminar un bloqueo, regenerar schedules para que se creen
    // los slots que antes estaban bloqueados
    await this.scheduleRegenerationService.regenerateForDoctor(
      existing.doctorId,
      existing.startDate,
      existing.endDate,
    );
  }
}
