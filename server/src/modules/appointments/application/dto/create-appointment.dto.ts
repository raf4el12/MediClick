import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1, description: 'ID del paciente' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El patientId es obligatorio' })
  patientId: number;

  @ApiProperty({ example: 1, description: 'ID del horario (turno general del doctor)' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El scheduleId es obligatorio' })
  scheduleId: number;

  @ApiProperty({
    example: '08:20',
    description: 'Hora de inicio del slot (HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime debe tener formato HH:mm',
  })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  startTime: string;

  @ApiProperty({
    example: '08:40',
    description: 'Hora de fin del slot (HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime debe tener formato HH:mm',
  })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  endTime: string;

  @ApiPropertyOptional({
    example: 'Dolor de cabeza frecuente',
    description: 'Motivo de consulta',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
