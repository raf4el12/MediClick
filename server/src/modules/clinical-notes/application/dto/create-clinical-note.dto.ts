import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClinicalNoteDto {
  @ApiProperty({ example: 1, description: 'ID de la cita médica' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El appointmentId es obligatorio' })
  appointmentId: number;

  @ApiPropertyOptional({ example: 'Paciente presenta cefalea crónica', description: 'Observaciones clínicas' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ example: 'G43.9 - Migraña', description: 'Diagnóstico (CIE-10 o texto libre)' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Reposo y control en 15 días', description: 'Plan de tratamiento' })
  @IsString()
  @IsOptional()
  plan?: string;
}
