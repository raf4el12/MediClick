import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsBoolean,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateSchedulesDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID del doctor (null = todos los doctores)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  doctorId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la especialidad (null = todas las especialidades)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  specialtyId?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Mes (1-12). Requerido si no se usa dateFrom/dateTo',
  })
  @Type(() => Number)
  @IsInt()
  @ValidateIf((o) => !o.dateFrom)
  month?: number;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Año. Requerido si no se usa dateFrom/dateTo',
  })
  @Type(() => Number)
  @IsInt()
  @ValidateIf((o) => !o.dateFrom)
  year?: number;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description:
      'Fecha inicio del rango (YYYY-MM-DD). Alternativa a month/year',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-31',
    description: 'Fecha fin del rango (YYYY-MM-DD). Alternativa a month/year',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Si true, elimina horarios no reservados en el rango antes de generar',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  overwrite?: boolean;
}
