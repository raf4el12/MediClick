import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export class FindAllSchedulesQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de doctor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctorId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por ID de especialidad',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  specialtyId?: number;

  @ApiPropertyOptional({
    example: '2026-02-12',
    description: 'Fecha inicio (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-02-12',
    description: 'Fecha fin (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
