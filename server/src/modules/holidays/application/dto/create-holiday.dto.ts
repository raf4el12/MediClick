import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ example: 'Año Nuevo', description: 'Nombre del feriado' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del feriado es obligatorio' })
  name: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Fecha del feriado en formato ISO',
  })
  @IsDateString({}, { message: 'La fecha debe ser una cadena ISO válida' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  date: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si el feriado se repite cada año',
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
