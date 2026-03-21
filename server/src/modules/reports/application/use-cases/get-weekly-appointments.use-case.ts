import { Injectable, Inject } from '@nestjs/common';
import { WeeklyAppointmentReportDto } from '../dto/report-response.dto.js';
import type { IReportRepository } from '../../domain/interfaces/report-repository.interface.js';

@Injectable()
export class GetWeeklyAppointmentsUseCase {
  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
  ) {}

  async execute(clinicId?: number | null): Promise<WeeklyAppointmentReportDto[]> {
    return this.reportRepository.getWeeklyAppointments(clinicId);
  }
}
