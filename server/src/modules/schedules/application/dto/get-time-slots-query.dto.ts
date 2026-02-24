import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTimeSlotsQueryDto {
  @ApiProperty({ example: 1, description: 'ID del doctor' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El doctorId es obligatorio' })
  doctorId: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la especialidad (determina la duración de cada slot)',
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El specialtyId es obligatorio' })
  specialtyId: number;

  @ApiProperty({
    example: '2026-03-10',
    description: 'Fecha de consulta (YYYY-MM-DD)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  date: string;
}
