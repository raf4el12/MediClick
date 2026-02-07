import { ApiProperty } from '@nestjs/swagger';
import { ScheduleResponseDto } from './schedule-response.dto.js';

export class PaginatedScheduleResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [ScheduleResponseDto] })
  rows: ScheduleResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
