import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateSpecialtyDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ example: 'Cardiología Pediátrica' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Especialidad en corazón infantil' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ example: 150.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 'Traer exámenes previos' })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiPropertyOptional({ example: 'cardio-icon' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
