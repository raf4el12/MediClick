import { ApiProperty } from '@nestjs/swagger';
import { SpecialtyResponseDto } from './specialty-response.dto.js';

export class PaginatedSpecialtyResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [SpecialtyResponseDto] })
  rows: SpecialtyResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
