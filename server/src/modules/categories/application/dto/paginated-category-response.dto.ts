import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from './category-response.dto.js';

export class PaginatedCategoryResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [CategoryResponseDto] })
  rows: CategoryResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
