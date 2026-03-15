import { ApiProperty } from '@nestjs/swagger';
import { HolidayResponseDto } from './holiday-response.dto.js';

export class PaginatedHolidayResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [HolidayResponseDto] })
  rows: HolidayResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
