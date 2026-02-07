import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityResponseDto } from './availability-response.dto.js';

export class PaginatedAvailabilityResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [AvailabilityResponseDto] })
  rows: AvailabilityResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
