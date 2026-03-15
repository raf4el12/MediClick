import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

enum ScheduleBlockType {
  FULL_DAY = 'FULL_DAY',
  TIME_RANGE = 'TIME_RANGE',
}

export class UpdateScheduleBlockDto {
  @ApiPropertyOptional({
    enum: ScheduleBlockType,
    example: 'FULL_DAY',
    description: 'Tipo de bloqueo: FULL_DAY o TIME_RANGE',
  })
  @IsOptional()
  @IsEnum(ScheduleBlockType, {
    message: 'El tipo debe ser FULL_DAY o TIME_RANGE',
  })
  type?: ScheduleBlockType;

  @ApiPropertyOptional({
    example: '2026-03-20',
    description: 'Fecha de inicio del bloqueo (ISO)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser una fecha ISO válida' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-03-22',
    description: 'Fecha de fin del bloqueo (ISO)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate debe ser una fecha ISO válida' })
  endDate?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Hora de inicio del bloqueo (HH:mm)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeFrom debe tener formato HH:mm',
  })
  timeFrom?: string;

  @ApiPropertyOptional({
    example: '12:00',
    description: 'Hora de fin del bloqueo (HH:mm)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeTo debe tener formato HH:mm',
  })
  timeTo?: string;

  @ApiPropertyOptional({
    example: 'Vacaciones del doctor',
    description: 'Motivo del bloqueo',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo del bloqueo',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
