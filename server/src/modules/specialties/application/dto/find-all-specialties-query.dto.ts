import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export class FindAllSpecialtiesQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de categoria',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}
