import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class SeedHolidaysDto {
  @ApiProperty({
    example: 2026,
    description: 'Año para el cual se generarán los feriados',
    minimum: 2020,
    maximum: 2100,
  })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(2020, { message: 'El año mínimo es 2020' })
  @Max(2100, { message: 'El año máximo es 2100' })
  year: number;
}

export class SeedHolidaysResponseDto {
  @ApiProperty({ example: 12, description: 'Cantidad de feriados creados' })
  seeded: number;

  @ApiProperty({ example: 2026, description: 'Año de los feriados' })
  year: number;

  @ApiProperty({
    example: 'Se sembraron 12 feriados para el año 2026',
    description: 'Mensaje descriptivo del resultado',
  })
  message: string;
}
