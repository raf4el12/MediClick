import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export class FindAllPatientsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'Filtrar por estado activo/inactivo',
  })
  @IsOptional()
  @IsString()
  isActive?: string;
}
