import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MedicalHistoryQueryDto {
  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'RESOLVED', 'CHRONIC'],
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1, description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Límite por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
