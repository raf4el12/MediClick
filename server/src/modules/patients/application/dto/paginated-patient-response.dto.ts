import { ApiProperty } from '@nestjs/swagger';
import { PatientResponseDto } from './patient-response.dto.js';

export class PaginatedPatientResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [PatientResponseDto] })
  rows: PatientResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  activeCount: number;

  @ApiProperty()
  inactiveCount: number;
}
