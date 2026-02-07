import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: 5, description: 'ID del nuevo horario' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El nuevo scheduleId es obligatorio' })
  newScheduleId: number;

  @ApiPropertyOptional({ example: 'Cambio por disponibilidad', description: 'Motivo del reagendamiento' })
  @IsString()
  @IsOptional()
  reason?: string;
}
