import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

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
