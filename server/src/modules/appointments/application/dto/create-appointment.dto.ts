import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1, description: 'ID del paciente' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El patientId es obligatorio' })
  patientId: number;

  @ApiProperty({ example: 1, description: 'ID del horario disponible' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El scheduleId es obligatorio' })
  scheduleId: number;

  @ApiPropertyOptional({
    example: 'Dolor de cabeza frecuente',
    description: 'Motivo de consulta',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
