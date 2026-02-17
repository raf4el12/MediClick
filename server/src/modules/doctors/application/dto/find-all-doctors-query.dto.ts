import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export class FindAllDoctorsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de especialidad',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  specialtyId?: number;
}
