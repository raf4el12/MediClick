import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class UpdateHolidayDto {
  @ApiPropertyOptional({ example: 'Año Nuevo', description: 'Nombre del feriado' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Fecha del feriado en formato ISO',
  })
  @IsDateString({}, { message: 'La fecha debe ser una cadena ISO válida' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si el feriado se repite cada año',
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el feriado está activo',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
