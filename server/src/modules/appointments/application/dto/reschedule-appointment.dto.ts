import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: 5, description: 'ID del nuevo horario' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El nuevo scheduleId es obligatorio' })
  newScheduleId: number;

  @ApiProperty({
    example: '09:00',
    description: 'Hora de inicio del nuevo slot (HH:mm)',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime debe tener formato HH:mm' })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  startTime: string;

  @ApiProperty({
    example: '09:20',
    description: 'Hora de fin del nuevo slot (HH:mm)',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime debe tener formato HH:mm' })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  endTime: string;

  @ApiPropertyOptional({
    example: 'Cambio por disponibilidad',
    description: 'Motivo del reagendamiento',
  })
  @IsString()
  @MaxLength(500, { message: 'El motivo no debe exceder 500 caracteres' })
  @IsOptional()
  reason?: string;
}
