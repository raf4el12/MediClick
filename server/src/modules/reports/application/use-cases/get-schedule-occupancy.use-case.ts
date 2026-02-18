import { Injectable, Inject } from '@nestjs/common';
import { ScheduleOccupancyReportDto } from '../dto/report-response.dto.js';
import type { IReportRepository } from '../../domain/interfaces/report-repository.interface.js';

@Injectable()
export class GetScheduleOccupancyUseCase {
  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
  ) {}

  async execute(
    month: number,
    year: number,
  ): Promise<ScheduleOccupancyReportDto> {
    return this.reportRepository.getScheduleOccupancy(month, year);
  }
}
