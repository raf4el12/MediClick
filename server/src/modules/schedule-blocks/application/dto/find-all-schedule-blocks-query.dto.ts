import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

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
