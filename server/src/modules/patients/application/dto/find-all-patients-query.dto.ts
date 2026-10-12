import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const PATIENT_SORT_FIELDS = [
  'id',
  'bloodType',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(PATIENT_SORT_FIELDS)
export class FindAllPatientsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'Filtrar por estado activo/inactivo',
  })
  @IsOptional()
  @IsString()
  isActive?: string;
}
