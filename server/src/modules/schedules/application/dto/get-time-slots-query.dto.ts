import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetTimeSlotsQueryDto {
  @ApiProperty({ example: 1, description: 'ID del doctor' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El doctorId es obligatorio' })
  doctorId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la especialidad (filtra los horarios generados)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  specialtyId?: number;

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

  @ApiProperty({
    example: '08:00',
    description: 'Hora de inicio del turno (HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeFrom debe tener formato HH:mm',
  })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  timeFrom: string;

  @ApiProperty({
    example: '14:00',
    description: 'Hora de fin del turno (HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeTo debe tener formato HH:mm',
  })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  timeTo: string;

  @ApiProperty({
    example: 20,
    description: 'Duración de cada cita en minutos (ej. 20 para Medicina General)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La duración mínima es 1 minuto' })
  @IsNotEmpty({ message: 'La duración de la cita es obligatoria' })
  durationMinutes: number;
}
