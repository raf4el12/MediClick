import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const AVAILABILITY_SORT_FIELDS = [
  'id',
  'dayOfWeek',
  'type',
  'startDate',
  'endDate',
  'timeFrom',
  'timeTo',
  'isAvailable',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(AVAILABILITY_SORT_FIELDS)
export class FindAllAvailabilityQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de doctor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctorId?: number;
}
