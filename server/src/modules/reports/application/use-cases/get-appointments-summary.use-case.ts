import { Injectable, Inject } from '@nestjs/common';
import { AppointmentsSummaryReportDto } from '../dto/report-response.dto.js';
import type { IReportRepository } from '../../domain/interfaces/report-repository.interface.js';

@Injectable()
export class GetAppointmentsSummaryUseCase {
  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
  ) {}

  async execute(
    month: number,
    year: number,
  ): Promise<AppointmentsSummaryReportDto> {
    return this.reportRepository.getAppointmentsSummary(month, year);
  }
}
