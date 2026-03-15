import { ApiProperty } from '@nestjs/swagger';
import { ScheduleBlockResponseDto } from './schedule-block-response.dto.js';

export class PaginatedScheduleBlockResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [ScheduleBlockResponseDto] })
  rows: ScheduleBlockResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
