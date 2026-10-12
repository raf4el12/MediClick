import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const SPECIALTY_SORT_FIELDS = [
  'id',
  'name',
  'duration',
  'bufferMinutes',
  'price',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(SPECIALTY_SORT_FIELDS)
export class FindAllSpecialtiesQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de categoria',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de sede (muestra globales + sede)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clinicId?: number;
}
