import { Injectable, Inject } from '@nestjs/common';
import { RevenueReportDto } from '../dto/report-response.dto.js';
import type { IReportRepository } from '../../domain/interfaces/report-repository.interface.js';

@Injectable()
export class GetRevenueUseCase {
  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
  ) {}

  async execute(
    month: number,
    year: number,
    clinicId?: number | null,
  ): Promise<RevenueReportDto> {
    return this.reportRepository.getRevenue(month, year, clinicId);
  }
}
