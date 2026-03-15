import { Injectable, Inject } from '@nestjs/common';
import type { IScheduleRepository } from '../repositories/schedule.repository.js';
import { GenerateSchedulesUseCase } from '../../application/use-cases/generate-schedules.use-case.js';

/**
 * Servicio de dominio para regeneración automática de schedules.
 *
 * Cuando cambia una availability o se crea/modifica/elimina un bloqueo,
 * este servicio limpia los schedules afectados (sin citas reservadas)
 * y los regenera automáticamente.
 */
@Injectable()
export class ScheduleRegenerationService {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    private readonly generateSchedulesUseCase: GenerateSchedulesUseCase,
  ) {}

  /**
   * Elimina los schedules sin citas del doctor en el rango y regenera
   * los schedules para los meses afectados.
   */
  async regenerateForDoctor(
    doctorId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{ deleted: number; generated: number }> {
    // 1. Eliminar schedules sin reservas en el rango afectado
    const deleted =
      await this.scheduleRepository.deleteUnbookedByDoctorAndDateRange(
        doctorId,
        dateFrom,
        dateTo,
      );

    // 2. Determinar los meses afectados para regenerar
    const months = this.getAffectedMonths(dateFrom, dateTo);

    let totalGenerated = 0;
    for (const { year, month } of months) {
      const result = await this.generateSchedulesUseCase.execute({
        year,
        month,
        doctorId,
      });
      totalGenerated += result.generated;
    }

    return { deleted, generated: totalGenerated };
  }

  /**
   * Obtiene la lista de meses (año + mes) que cubren el rango de fechas.
   */
  private getAffectedMonths(
    dateFrom: Date,
    dateTo: Date,
  ): { year: number; month: number }[] {
    const months: { year: number; month: number }[] = [];
    const current = new Date(
      dateFrom.getFullYear(),
      dateFrom.getMonth(),
      1,
    );
    const end = new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);

    while (current <= end) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }
}
