import { ApiProperty } from '@nestjs/swagger';
import { DoctorResponseDto } from './doctor-response.dto.js';

export class PaginatedDoctorResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [DoctorResponseDto] })
  rows: DoctorResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
