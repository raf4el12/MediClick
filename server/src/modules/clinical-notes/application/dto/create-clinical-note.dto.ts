import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClinicalNoteDto {
  @ApiProperty({ example: 1, description: 'ID de la cita médica' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El appointmentId es obligatorio' })
  appointmentId: number;

  @ApiPropertyOptional({
    example: 'Paciente presenta cefalea crónica',
    description: 'Observaciones clínicas',
  })
  @IsString()
  @MaxLength(2000, { message: 'Las observaciones no deben exceder 2000 caracteres' })
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({
    example: 'G43.9 - Migraña',
    description: 'Diagnóstico (CIE-10 o texto libre)',
  })
  @IsString()
  @MaxLength(1000, { message: 'El diagnóstico no debe exceder 1000 caracteres' })
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({
    example: 'Reposo y control en 15 días',
    description: 'Plan de tratamiento',
  })
  @IsString()
  @MaxLength(2000, { message: 'El plan no debe exceder 2000 caracteres' })
  @IsOptional()
  plan?: string;
}
