import { ApiProperty } from '@nestjs/swagger';
import { ClinicResponseDto } from './clinic-response.dto.js';

export class PaginatedClinicResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [ClinicResponseDto] })
  rows: ClinicResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
