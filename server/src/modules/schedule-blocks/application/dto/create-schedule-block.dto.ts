import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

enum ScheduleBlockType {
  FULL_DAY = 'FULL_DAY',
  TIME_RANGE = 'TIME_RANGE',
}

export class CreateScheduleBlockDto {
  @ApiProperty({ example: 1, description: 'ID del doctor' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El doctorId es obligatorio' })
  doctorId: number;

  @ApiProperty({
    enum: ScheduleBlockType,
    example: 'FULL_DAY',
    description: 'Tipo de bloqueo: FULL_DAY o TIME_RANGE',
  })
  @IsEnum(ScheduleBlockType, {
    message: 'El tipo debe ser FULL_DAY o TIME_RANGE',
  })
  @IsNotEmpty({ message: 'El tipo de bloqueo es obligatorio' })
  type: ScheduleBlockType;

  @ApiProperty({
    example: '2026-03-20',
    description: 'Fecha de inicio del bloqueo (ISO)',
  })
  @IsDateString({}, { message: 'startDate debe ser una fecha ISO válida' })
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  startDate: string;

  @ApiProperty({
    example: '2026-03-22',
    description: 'Fecha de fin del bloqueo (ISO)',
  })
  @IsDateString({}, { message: 'endDate debe ser una fecha ISO válida' })
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  endDate: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Hora de inicio del bloqueo (HH:mm). Requerido si type es TIME_RANGE',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeFrom debe tener formato HH:mm',
  })
  timeFrom?: string;

  @ApiPropertyOptional({
    example: '12:00',
    description: 'Hora de fin del bloqueo (HH:mm). Requerido si type es TIME_RANGE',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeTo debe tener formato HH:mm',
  })
  timeTo?: string;

  @ApiProperty({
    example: 'Vacaciones del doctor',
    description: 'Motivo del bloqueo',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del bloqueo es obligatorio' })
  reason: string;
}
