import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const SCHEDULE_BLOCK_SORT_FIELDS = [
  'id',
  'type',
  'startDate',
  'endDate',
  'timeFrom',
  'timeTo',
  'reason',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(SCHEDULE_BLOCK_SORT_FIELDS)
export class FindAllScheduleBlocksQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de doctor',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  doctorId?: number;
}
