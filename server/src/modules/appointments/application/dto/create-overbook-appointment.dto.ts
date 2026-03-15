import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOverbookAppointmentDto {
  @ApiProperty({ example: 1, description: 'ID del paciente' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El patientId es obligatorio' })
  patientId: number;

  @ApiProperty({ example: 1, description: 'ID del doctor' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El doctorId es obligatorio' })
  doctorId: number;

  @ApiProperty({ example: 1, description: 'ID de la especialidad' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El specialtyId es obligatorio' })
  specialtyId: number;

  @ApiProperty({
    example: '2026-03-20',
    description: 'Fecha de la cita (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  date: string;

  @ApiPropertyOptional({
    example: 'Paciente requiere atención adicional',
    description: 'Motivo de la cita de sobrecupo',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
