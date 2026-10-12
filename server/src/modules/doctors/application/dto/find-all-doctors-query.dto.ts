import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { SortableBy } from '../../../../shared/utils/dtos/sortable-by.decorator.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export const DOCTOR_SORT_FIELDS = [
  'id',
  'licenseNumber',
  'isActive',
  'ratingAvg',
  'ratingCount',
  'maxOverbookPerDay',
  'createdAt',
  'updatedAt',
] as const;

@SortableBy(DOCTOR_SORT_FIELDS)
export class FindAllDoctorsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de especialidad',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  specialtyId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de sede (solo para pacientes)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  clinicId?: number;
}
