import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

export class CreateAvailabilityDto {
  @ApiProperty({ example: 1, description: 'ID del doctor' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El doctorId es obligatorio' })
  doctorId: number;

  @ApiProperty({ example: 1, description: 'ID de la especialidad asignada al doctor' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El specialtyId es obligatorio' })
  specialtyId: number;

  @ApiProperty({ example: '2026-03-01', description: 'Fecha inicio de vigencia (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'startDate debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'Fecha fin de vigencia (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'endDate debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  endDate: string;

  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY, description: 'Día de la semana' })
  @IsEnum(DayOfWeek, { message: 'dayOfWeek debe ser un día válido' })
  @IsNotEmpty({ message: 'El día de la semana es obligatorio' })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00', description: 'Hora inicio (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'timeFrom debe tener formato HH:mm' })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  timeFrom: string;

  @ApiProperty({ example: '14:00', description: 'Hora fin (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'timeTo debe tener formato HH:mm' })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  timeTo: string;

  @ApiProperty({ enum: AvailabilityType, example: AvailabilityType.REGULAR, description: 'Tipo de disponibilidad' })
  @IsEnum(AvailabilityType, { message: 'type debe ser REGULAR, EXCEPTION o EXTRA' })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  type: AvailabilityType;

  @ApiPropertyOptional({ example: 'Horario de consultorio principal', description: 'Razón o nota' })
  @IsString()
  @IsOptional()
  reason?: string;
}
