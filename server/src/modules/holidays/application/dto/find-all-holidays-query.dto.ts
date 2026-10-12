import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const HOLIDAY_SORT_FIELDS = [
  'id',
  'name',
  'date',
  'year',
  'isRecurring',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(HOLIDAY_SORT_FIELDS)
export class FindAllHolidaysQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 2026,
    description: 'Filtrar feriados por año',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}
