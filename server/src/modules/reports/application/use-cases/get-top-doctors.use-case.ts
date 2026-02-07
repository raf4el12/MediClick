import { Injectable, Inject } from '@nestjs/common';
import { TopDoctorReportDto } from '../dto/report-response.dto.js';
import type { IReportRepository } from '../../domain/interfaces/report-repository.interface.js';

@Injectable()
export class GetTopDoctorsUseCase {
  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
  ) {}

  async execute(month: number, year: number, limit: number = 10): Promise<TopDoctorReportDto[]> {
    return this.reportRepository.getTopDoctors(month, year, limit);
  }
}
