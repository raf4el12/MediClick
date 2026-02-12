import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

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
