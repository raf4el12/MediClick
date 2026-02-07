import { ApiProperty } from '@nestjs/swagger';
import { AppointmentResponseDto } from './appointment-response.dto.js';

export class PaginatedAppointmentResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [AppointmentResponseDto] })
  rows: AppointmentResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
